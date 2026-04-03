import { OpportunityInputSchema } from '@openfons/contracts';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import {
  buildCompilation,
  buildOpportunity,
  InvalidOpportunityInputError,
  UnsupportedCompilationCaseError
} from './compiler.js';
import { createMemoryStore, type MemoryStore } from './store.js';

type BuildCompilationOptions = Parameters<typeof buildCompilation>[1];

export const createApp = (
  options: BuildCompilationOptions = {},
  store: MemoryStore = createMemoryStore()
) => {
  const app = new Hono();

  app.get('/health', (c) => c.json({ status: 'ok' }));

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
      compiled = await buildCompilation(opportunity, options);
    } catch (error) {
      if (error instanceof UnsupportedCompilationCaseError) {
        throw new HTTPException(409, {
          message: error.message
        });
      }

      throw error;
    }

    store.saveCompilation(compiled);

    return c.json(compiled);
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
