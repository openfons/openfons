import { OpportunityInputSchema } from '@openfons/contracts';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { buildCompilation, buildOpportunity } from './compiler.js';
import { createMemoryStore, type MemoryStore } from './store.js';

export const createApp = (store: MemoryStore = createMemoryStore()) => {
  const app = new Hono();

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.post('/api/v1/opportunities', async (c) => {
    const payload = await c.req.json();
    const parsed = OpportunityInputSchema.safeParse(payload);

    if (!parsed.success) {
      throw new HTTPException(400, {
        message: parsed.error.message
      });
    }

    const opportunity = buildOpportunity(parsed.data);
    store.saveOpportunity(opportunity);

    return c.json({ opportunity }, 201);
  });

  app.post('/api/v1/opportunities/:opportunityId/compile', (c) => {
    const opportunityId = c.req.param('opportunityId');
    const opportunity = store.getOpportunity(opportunityId);

    if (!opportunity) {
      throw new HTTPException(404, {
        message: 'Opportunity not found'
      });
    }

    const compiled = buildCompilation(opportunity);
    store.saveCompilation(compiled);

    return c.json(compiled);
  });

  app.get('/api/v1/reports/:reportId', (c) => {
    const report = store.getReport(c.req.param('reportId'));

    if (!report) {
      throw new HTTPException(404, {
        message: 'Report not found'
      });
    }

    return c.json(report);
  });

  return app;
};
