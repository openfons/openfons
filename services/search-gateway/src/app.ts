import type {
  ProviderStatus,
  SearchRequest,
  SearchRunResult,
  UpgradeDispatchResult,
  ValidationResult
} from '@openfons/contracts';
import { SearchRequestSchema } from '@openfons/contracts';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createMemoryStore, type MemoryStore } from './store.js';

export const createApp = (
  deps: {
    search: (input: SearchRequest) => Promise<SearchRunResult>;
    providerStatus: (projectId?: string) => ProviderStatus[];
    validate?: (projectId?: string) => ValidationResult;
    upgrade?: (
      searchRunId: string,
      selection: { selectedSearchResultIds: string[] }
    ) => Promise<UpgradeDispatchResult>;
  },
  store: MemoryStore = createMemoryStore()
) => {
  const app = new Hono();

  const parseJsonBody = async (
    request: { json: () => Promise<unknown> },
    message = 'Invalid JSON payload'
  ) => {
    try {
      return await request.json();
    } catch {
      throw new HTTPException(400, {
        message
      });
    }
  };

  const parseOptionalJsonBody = async (
    request: { raw: Request },
    message = 'Invalid JSON payload'
  ) => {
    const rawBody = await request.raw.clone().text();

    if (rawBody.trim() === '') {
      return {};
    }

    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      throw new HTTPException(400, {
        message
      });
    }
  };

  app.post('/api/v1/search/runs', async (c) => {
    const payload = await parseJsonBody(c.req);
    const parsed = SearchRequestSchema.safeParse(payload);

    if (!parsed.success) {
      throw new HTTPException(400, {
        message: parsed.error.message
      });
    }

    const result = await deps.search(parsed.data);
    store.saveRun(result);
    return c.json(result, 201);
  });

  app.get('/api/v1/search/runs/:id', (c) => {
    const run = store.getRun(c.req.param('id'));

    if (!run) {
      throw new HTTPException(404, { message: 'Search run not found' });
    }

    return c.json(run);
  });

  app.post('/api/v1/search/runs/:id/upgrade', async (c) => {
    if (!deps.upgrade) {
      throw new HTTPException(501, {
        message: 'Upgrade dispatch not configured'
      });
    }

    if (!store.getRun(c.req.param('id'))) {
      throw new HTTPException(404, {
        message: 'Search run not found'
      });
    }

    const payload = await parseJsonBody(c.req);
    const result = await deps.upgrade(c.req.param('id'), payload as {
      selectedSearchResultIds: string[];
    });
    store.saveDispatch(result);
    return c.json(result);
  });

  app.get('/api/v1/search/providers', (c) =>
    c.json({
      projectId: c.req.query('projectId'),
      providers: deps.providerStatus(c.req.query('projectId'))
    })
  );

  app.post('/api/v1/search/config/validate', async (c) => {
    const payload = (await parseOptionalJsonBody(c.req)) as {
      projectId?: string;
    };

    return c.json(
      deps.validate
        ? deps.validate(payload.projectId)
        : {
            valid: true,
            errors: [],
            warnings: [],
            resolvedProviders: deps.providerStatus(payload.projectId)
          }
    );
  });

  return app;
};
