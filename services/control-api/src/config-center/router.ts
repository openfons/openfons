import {
  PluginWriteRequestSchema,
  ProjectBindingWriteRequestSchema
} from '@openfons/contracts';
import { Hono, type Context } from 'hono';
import { createConfigCenterService } from './service.js';

export const createConfigCenterRouter = (options: {
  repoRoot: string;
  secretRoot?: string;
}) => {
  const service = createConfigCenterService(options);
  const app = new Hono();
  const isMissingPathError = (error: unknown): error is NodeJS.ErrnoException =>
    error instanceof Error && 'code' in error && error.code === 'ENOENT';
  const notFoundBody = { error: 'not-found' } as const;
  const readWithNotFound = <T>(fn: () => T) => {
    try {
      return {
        missing: false as const,
        value: fn()
      };
    } catch (error) {
      if (isMissingPathError(error)) {
        return {
          missing: true as const
        };
      }

      throw error;
    }
  };
  const jsonWithNotFound = <T>(c: Context, fn: () => T) => {
    const result = readWithNotFound(fn);
    return result.missing ? c.json(notFoundBody, 404) : c.json(result.value);
  };

  const mapWriteError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'config write failed';

    if (isMissingPathError(error)) {
      return {
        status: 404 as const,
        body: { error: 'not-found', message }
      };
    }

    if (message.startsWith('revision conflict')) {
      return {
        status: 409 as const,
        body: { error: 'revision-conflict', message }
      };
    }

    if (message.startsWith('lock unavailable')) {
      return {
        status: 423 as const,
        body: { error: 'lock-unavailable', message }
      };
    }

    if (message.startsWith('invalid ')) {
      return {
        status: 400 as const,
        body: { error: 'invalid-config', message }
      };
    }

    return {
      status: 500 as const,
      body: { error: 'config-write-failed', message }
    };
  };

  app.get('/plugin-types', (c) =>
    c.json({
      pluginTypes: service.listPluginTypes()
    })
  );

  app.get('/plugin-types/:typeId', (c) => {
    const pluginType = service.getPluginType(c.req.param('typeId'));
    return pluginType ? c.json(pluginType) : c.json({ error: 'not-found' }, 404);
  });

  app.get('/plugins', (c) => c.json({ plugins: service.listPlugins() }));

  app.get('/plugins/:pluginId', (c) => {
    const plugin = service.getPlugin(c.req.param('pluginId'));
    return plugin ? c.json(plugin) : c.json({ error: 'not-found' }, 404);
  });

  app.get('/projects/:projectId/bindings', (c) =>
    jsonWithNotFound(c, () => service.getProjectBindings(c.req.param('projectId')))
  );

  app.put('/plugins/:pluginId', async (c) => {
    let payload: unknown;

    try {
      payload = await c.req.json();
    } catch {
      return c.json(
        {
          error: 'invalid-request',
          message: 'Invalid JSON payload'
        },
        400
      );
    }

    const parsed = PluginWriteRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json(
        {
          error: 'invalid-request',
          message: parsed.error.message
        },
        400
      );
    }

    try {
      return c.json(
        await service.writePlugin({
          projectId: c.req.query('projectId') ?? 'openfons',
          pluginId: c.req.param('pluginId'),
          expectedRevision: parsed.data.expectedRevision,
          dryRun: c.req.query('dryRun') === 'true' || parsed.data.dryRun,
          plugin: parsed.data.plugin
        })
      );
    } catch (error) {
      const mapped = mapWriteError(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.put('/projects/:projectId/bindings', async (c) => {
    let payload: unknown;

    try {
      payload = await c.req.json();
    } catch {
      return c.json(
        {
          error: 'invalid-request',
          message: 'Invalid JSON payload'
        },
        400
      );
    }

    const parsed = ProjectBindingWriteRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json(
        {
          error: 'invalid-request',
          message: parsed.error.message
        },
        400
      );
    }

    try {
      return c.json(
        await service.writeProjectBindings({
          projectId: c.req.param('projectId'),
          expectedRevision: parsed.data.expectedRevision,
          dryRun: c.req.query('dryRun') === 'true' || parsed.data.dryRun,
          binding: parsed.data.binding
        })
      );
    } catch (error) {
      const mapped = mapWriteError(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.post('/validate', (c) => c.json(service.validateAll()));

  app.post('/projects/:projectId/validate', (c) =>
    jsonWithNotFound(c, () => service.getProjectValidation(c.req.param('projectId')))
  );

  app.post('/projects/:projectId/routes/:routeKey/preflight', (c) =>
    jsonWithNotFound(c, () =>
      service.getCrawlerRoutePreflight({
        projectId: c.req.param('projectId'),
        routeKey: c.req.param('routeKey')
      })
    )
  );

  app.post('/projects/:projectId/resolve', (c) =>
    jsonWithNotFound(c, () => service.resolveProject(c.req.param('projectId')))
  );

  app.post('/plugins/:pluginId/resolve', (c) => {
    const projectId = c.req.query('projectId');

    if (!projectId) {
      return c.json({ error: 'projectId is required' }, 400);
    }

    const result = readWithNotFound(() =>
      service.resolvePlugin({
        projectId,
        pluginId: c.req.param('pluginId')
      })
    );

    if (result.missing) {
      return c.json(notFoundBody, 404);
    }

    return result.value ? c.json(result.value) : c.json(notFoundBody, 404);
  });

  return app;
};
