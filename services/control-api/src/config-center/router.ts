import { Hono } from 'hono';
import { createConfigCenterService } from './service.js';

export const createConfigCenterRouter = (options: {
  repoRoot: string;
  secretRoot?: string;
}) => {
  const service = createConfigCenterService(options);
  const app = new Hono();

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
