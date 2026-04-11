import {
  PluginWriteRequestSchema,
  ProjectBindingWriteRequestSchema
} from '@openfons/contracts';
import { Hono } from 'hono';
import { createConfigCenterService } from './service.js';

export const createConfigCenterRouter = (options: {
  repoRoot: string;
  secretRoot?: string;
}) => {
  const service = createConfigCenterService(options);
  const app = new Hono();
  const mapWriteError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'config write failed';

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
    c.json(service.getProjectBindings(c.req.param('projectId')))
  );

  app.put('/plugins/:pluginId', async (c) => {
    const payload = PluginWriteRequestSchema.parse(await c.req.json());

    try {
      return c.json(
        await service.writePlugin({
          projectId: c.req.query('projectId') ?? 'openfons',
          pluginId: c.req.param('pluginId'),
          expectedRevision: payload.expectedRevision,
          dryRun: c.req.query('dryRun') === 'true' || payload.dryRun,
          plugin: payload.plugin
        })
      );
    } catch (error) {
      const mapped = mapWriteError(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.put('/projects/:projectId/bindings', async (c) => {
    const payload = ProjectBindingWriteRequestSchema.parse(await c.req.json());

    try {
      return c.json(
        await service.writeProjectBindings({
          projectId: c.req.param('projectId'),
          expectedRevision: payload.expectedRevision,
          dryRun: c.req.query('dryRun') === 'true' || payload.dryRun,
          binding: payload.binding
        })
      );
    } catch (error) {
      const mapped = mapWriteError(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  app.post('/validate', (c) => c.json(service.validateAll()));

  app.post('/projects/:projectId/validate', (c) =>
    c.json(service.getProjectValidation(c.req.param('projectId')))
  );

  app.post('/projects/:projectId/routes/:routeKey/preflight', (c) =>
    c.json(
      service.getCrawlerRoutePreflight({
        projectId: c.req.param('projectId'),
        routeKey: c.req.param('routeKey')
      })
    )
  );

  app.post('/projects/:projectId/resolve', (c) =>
    c.json(service.resolveProject(c.req.param('projectId')))
  );

  app.post('/plugins/:pluginId/resolve', (c) => {
    const projectId = c.req.query('projectId');

    if (!projectId) {
      return c.json({ error: 'projectId is required' }, 400);
    }

    const plugin = service.resolvePlugin({
      projectId,
      pluginId: c.req.param('pluginId')
    });

    return plugin ? c.json(plugin) : c.json({ error: 'not-found' }, 404);
  });

  return app;
};
