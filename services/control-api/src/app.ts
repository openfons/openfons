import { fileURLToPath } from 'node:url';
import {
  ApiErrorSchema,
  ConfirmOpportunityRequestSchema,
  OpportunityInputSchema,
  OpportunityQuestionSchema
} from '@openfons/contracts';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import {
  buildCompilation,
  CompilationPolicyError,
  buildOpportunity,
  InvalidOpportunityInputError,
  UnsupportedCompilationCaseError
} from './compiler.js';
import { deliverAiProcurementCompilation } from './artifacts/delivery.js';
import { createConfigCenterRouter } from './config-center/router.js';
import { planOpportunityFromQuestion } from './planning/pipeline.js';
import { createMemoryStore, type MemoryStore } from './store.js';

type BuildCompilationOptions = Parameters<typeof buildCompilation>[1];

type CreateAppOptions = BuildCompilationOptions & {
  artifactDelivery?: {
    repoRoot?: string;
  };
  configCenter?: {
    repoRoot: string;
    secretRoot?: string;
  };
};

const DEFAULT_ARTIFACT_REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

export const createApp = (
  options: CreateAppOptions = {},
  store: MemoryStore = createMemoryStore()
) => {
  const app = new Hono();
  const { configCenter, artifactDelivery, ...compilationOptions } = options;
  const artifactRepoRoot = artifactDelivery?.repoRoot ?? DEFAULT_ARTIFACT_REPO_ROOT;

  app.get('/health', (c) => c.json({ status: 'ok' }));

  if (configCenter) {
    app.route('/api/v1/config', createConfigCenterRouter(configCenter));
  }

  app.post('/api/v1/opportunities/plan', async (c) => {
    let payload: unknown;

    try {
      payload = await c.req.json();
    } catch {
      throw new HTTPException(400, {
        message: 'Invalid JSON payload'
      });
    }

    const parsed = OpportunityQuestionSchema.safeParse(payload);

    if (!parsed.success) {
      throw new HTTPException(400, {
        message: parsed.error.message
      });
    }

    const opportunity = planOpportunityFromQuestion(parsed.data);
    store.saveOpportunity(opportunity);

    return c.json({ opportunity }, 201);
  });

  app.post('/api/v1/opportunities', async (c) => {
    let payload: unknown;

    try {
      payload = await c.req.json();
    } catch {
      throw new HTTPException(400, {
        message: 'Invalid JSON payload'
      });
    }

    const parsed = OpportunityInputSchema.safeParse(payload);

    if (!parsed.success) {
      throw new HTTPException(400, {
        message: parsed.error.message
      });
    }

    let opportunity;

    try {
      opportunity = buildOpportunity(parsed.data);
    } catch (error) {
      if (error instanceof InvalidOpportunityInputError) {
        throw new HTTPException(400, {
          message: error.message
        });
      }

      throw error;
    }

    store.saveOpportunity(opportunity);

    return c.json({ opportunity }, 201);
  });

  app.post('/api/v1/opportunities/:opportunityId/confirm', async (c) => {
    const opportunityId = c.req.param('opportunityId');
    const opportunity = store.getOpportunity(opportunityId);

    if (!opportunity) {
      throw new HTTPException(404, {
        message: 'Opportunity not found'
      });
    }

    if (!opportunity.planning) {
      throw new HTTPException(409, {
        message: 'Opportunity does not require planning confirmation'
      });
    }

    if (opportunity.planning.approval.status === 'confirmed') {
      throw new HTTPException(409, {
        message: 'Opportunity is already confirmed'
      });
    }

    let payload: unknown;

    try {
      payload = await c.req.json();
    } catch {
      throw new HTTPException(400, {
        message: 'Invalid JSON payload'
      });
    }

    const parsed = ConfirmOpportunityRequestSchema.safeParse(payload);

    if (!parsed.success) {
      throw new HTTPException(400, {
        message: parsed.error.message
      });
    }

    const selected = opportunity.planning.options.find(
      (option) => option.id === parsed.data.selectedOptionId
    );

    if (!selected) {
      throw new HTTPException(400, {
        message: 'Selected opportunity option not found'
      });
    }

    const confirmed = {
      ...opportunity,
      planning: {
        ...opportunity.planning,
        approval: {
          status: 'confirmed' as const,
          selectedOptionId: selected.id,
          confirmedAt: new Date().toISOString(),
          confirmationNotes: parsed.data.confirmationNotes
        },
        trace: {
          ...opportunity.planning.trace,
          steps: [
            ...opportunity.planning.trace.steps,
            {
              step: 'confirm_user_scope' as const,
              status: 'completed' as const,
              summary: `Confirmed ${selected.primaryKeyword}.`
            }
          ]
        }
      }
    };

    store.saveOpportunity(confirmed);

    return c.json({ opportunity: confirmed });
  });

  app.post('/api/v1/opportunities/:opportunityId/compile', async (c) => {
    const opportunityId = c.req.param('opportunityId');
    const opportunity = store.getOpportunity(opportunityId);

    if (!opportunity) {
      throw new HTTPException(404, {
        message: 'Opportunity not found'
      });
    }

    let compiled;

    try {
      compiled = await buildCompilation(opportunity, compilationOptions);
    } catch (error) {
      if (error instanceof CompilationPolicyError) {
        return c.json(
          ApiErrorSchema.parse({
            code: error.code,
            message: error.message
          }),
          error.status
        );
      }

      if (error instanceof UnsupportedCompilationCaseError) {
        throw new HTTPException(409, {
          message: error.message
        });
      }

      throw error;
    }

    const finalized = await deliverAiProcurementCompilation(compiled, {
      repoRoot: artifactRepoRoot
    });

    store.saveCompilation(finalized);

    return c.json(finalized);
  });

  app.get('/api/v1/reports/:reportId', (c) => {
    const reportView = store.getReportView(c.req.param('reportId'));

    if (!reportView) {
      throw new HTTPException(404, {
        message: 'Report not found'
      });
    }

    return c.json(reportView);
  });

  return app;
};
