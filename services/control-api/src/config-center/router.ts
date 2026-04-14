import {
  ConfigCenterApiErrorSchema,
  PluginWriteRequestSchema,
  ProjectBindingWriteRequestSchema,
  type ConfigCenterApiError,
  type ConfigCenterResource
} from '@openfons/contracts';
import { Hono, type Context } from 'hono';
import {
  ConfigCenterError,
  isConfigCenterError,
  toConfigCenterApiError
} from '@openfons/config-center';
import { createConfigCenterService } from './service.js';

export const createConfigCenterRouter = (options: {
  repoRoot: string;
  secretRoot?: string;
}) => {
  const service = createConfigCenterService(options);
  const app = new Hono();
  const isMissingPathError = (error: unknown): error is NodeJS.ErrnoException =>
    error instanceof Error && 'code' in error && error.code === 'ENOENT';
  type RouteMeta = {
    resource: ConfigCenterResource;
    resourceId?: string;
    projectId?: string;
    routeKey?: string;
  };
  const buildApiErrorBody = (error: ConfigCenterApiError) =>
    ConfigCenterApiErrorSchema.parse(error);
  const buildNotFoundError = (
    message: string,
    meta: RouteMeta
  ): ConfigCenterApiError => ({
    error: 'not-found',
    message,
    resource: meta.resource,
    resourceId: meta.resourceId,
    projectId: meta.projectId,
    routeKey: meta.routeKey,
    retryable: false
  });
  const mapConfigCenterError = (error: unknown, meta: RouteMeta) => {
    const message = error instanceof Error ? error.message : 'unexpected error';

    if (isMissingPathError(error)) {
      return {
        status: 404 as const,
        body: buildApiErrorBody(buildNotFoundError(message, meta))
      };
    }

    if (isConfigCenterError(error)) {
      return {
        status: error.httpStatus,
        body: buildApiErrorBody(toConfigCenterApiError(error))
      };
    }

    if (message.startsWith('revision conflict')) {
      return {
        status: 409 as const,
        body: buildApiErrorBody({
          error: 'revision-conflict',
          message,
          resource: meta.resource,
          resourceId: meta.resourceId,
          projectId: meta.projectId,
          routeKey: meta.routeKey,
          retryable: true
        })
      };
    }

    if (message.startsWith('lock unavailable')) {
      return {
        status: 423 as const,
        body: buildApiErrorBody({
          error: 'lock-unavailable',
          message,
          resource: meta.resource,
          resourceId: meta.resourceId,
          projectId: meta.projectId,
          routeKey: meta.routeKey,
          retryable: true
        })
      };
    }

    if (message.startsWith('invalid ')) {
      return {
        status: 400 as const,
        body: buildApiErrorBody({
          error: 'invalid-config',
          message,
          resource: meta.resource,
          resourceId: meta.resourceId,
          projectId: meta.projectId,
          routeKey: meta.routeKey,
          retryable: false
        })
      };
    }

    return {
      status: 500 as const,
      body: buildApiErrorBody({
        error: 'config-write-failed',
        message,
        resource: meta.resource,
        resourceId: meta.resourceId,
        projectId: meta.projectId,
        routeKey: meta.routeKey,
        retryable: false
      })
    };
  };
  const jsonWithConfigCenterError = async <T>(
    c: Context,
    fn: () => T | Promise<T>,
    meta: RouteMeta
  ) => {
    try {
      return c.json(await fn());
    } catch (error) {
      const mapped = mapConfigCenterError(error, meta);
      return c.json(mapped.body, mapped.status);
    }
  };

  app.get('/plugin-types', (c) =>
    c.json({
      pluginTypes: service.listPluginTypes()
    })
  );

  app.get('/plugin-types/:typeId', (c) => {
    const pluginType = service.getPluginType(c.req.param('typeId'));
    return pluginType
      ? c.json(pluginType)
      : c.json(
          buildApiErrorBody({
            error: 'not-found',
            message: `plugin type ${c.req.param('typeId')} not found`,
            resource: 'config-center',
            resourceId: c.req.param('typeId'),
            retryable: false
          }),
          404
        );
  });

  app.get('/plugins', (c) => c.json({ plugins: service.listPlugins() }));

  app.get('/backups', (c) =>
    c.json({
      entries: service.listBackupHistory({
        resource: c.req.query('resource'),
        resourceId: c.req.query('resourceId'),
        projectId: c.req.query('projectId')
      })
    })
  );

  app.get('/plugins/:pluginId', (c) => {
    const plugin = service.getPlugin(c.req.param('pluginId'));
    return plugin
      ? c.json(plugin)
      : c.json(
          buildApiErrorBody({
            error: 'not-found',
            message: `plugin ${c.req.param('pluginId')} not found`,
            resource: 'plugin-instance',
            resourceId: c.req.param('pluginId'),
            retryable: false
          }),
          404
        );
  });

  app.get('/projects/:projectId/bindings', (c) =>
    jsonWithConfigCenterError(
      c,
      () => service.getProjectBindings(c.req.param('projectId')),
      {
        resource: 'project-binding',
        resourceId: c.req.param('projectId'),
        projectId: c.req.param('projectId')
      }
    )
  );

  app.get('/projects/:projectId/doctor', (c) =>
    jsonWithConfigCenterError(
      c,
      () => service.getProjectDoctor(c.req.param('projectId')),
      {
        resource: 'project-binding',
        resourceId: c.req.param('projectId'),
        projectId: c.req.param('projectId')
      }
    )
  );

  app.get('/projects/:projectId/readiness', (c) =>
    jsonWithConfigCenterError(
      c,
      () => service.getProjectReadiness(c.req.param('projectId')),
      {
        resource: 'project-binding',
        resourceId: c.req.param('projectId'),
        projectId: c.req.param('projectId')
      }
    )
  );

  app.put('/plugins/:pluginId', async (c) => {
    let payload: unknown;

    try {
      payload = await c.req.json();
    } catch {
      return c.json(
        buildApiErrorBody({
          error: 'invalid-request',
          message: 'Invalid JSON payload',
          resource: 'plugin-instance',
          resourceId: c.req.param('pluginId'),
          projectId: c.req.query('projectId') ?? 'openfons',
          retryable: false
        }),
        400
      );
    }

    const parsed = PluginWriteRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json(
        buildApiErrorBody({
          error: 'invalid-request',
          message: parsed.error.message,
          resource: 'plugin-instance',
          resourceId: c.req.param('pluginId'),
          projectId: c.req.query('projectId') ?? 'openfons',
          retryable: false
        }),
        400
      );
    }

    const projectId = c.req.query('projectId') ?? 'openfons';

    try {
      return c.json(
        await service.writePlugin({
          projectId,
          pluginId: c.req.param('pluginId'),
          expectedRevision: parsed.data.expectedRevision,
          dryRun: c.req.query('dryRun') === 'true' || parsed.data.dryRun,
          plugin: parsed.data.plugin
        })
      );
    } catch (error) {
      const mapped = mapConfigCenterError(error, {
        resource: 'plugin-instance',
        resourceId: c.req.param('pluginId'),
        projectId
      });
      return c.json(mapped.body, mapped.status);
    }
  });

  app.put('/projects/:projectId/bindings', async (c) => {
    let payload: unknown;

    try {
      payload = await c.req.json();
    } catch {
      return c.json(
        buildApiErrorBody({
          error: 'invalid-request',
          message: 'Invalid JSON payload',
          resource: 'project-binding',
          resourceId: c.req.param('projectId'),
          projectId: c.req.param('projectId'),
          retryable: false
        }),
        400
      );
    }

    const parsed = ProjectBindingWriteRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json(
        buildApiErrorBody({
          error: 'invalid-request',
          message: parsed.error.message,
          resource: 'project-binding',
          resourceId: c.req.param('projectId'),
          projectId: c.req.param('projectId'),
          retryable: false
        }),
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
      const mapped = mapConfigCenterError(error, {
        resource: 'project-binding',
        resourceId: c.req.param('projectId'),
        projectId: c.req.param('projectId')
      });
      return c.json(mapped.body, mapped.status);
    }
  });

  app.post('/validate', (c) => c.json(service.validateAll()));

  app.post('/projects/:projectId/validate', (c) =>
    jsonWithConfigCenterError(
      c,
      () => service.getProjectValidation(c.req.param('projectId')),
      {
        resource: 'project-binding',
        resourceId: c.req.param('projectId'),
        projectId: c.req.param('projectId')
      }
    )
  );

  app.post('/projects/:projectId/routes/:routeKey/preflight', (c) =>
    jsonWithConfigCenterError(
      c,
      () =>
        service.getCrawlerRoutePreflight({
          projectId: c.req.param('projectId'),
          routeKey: c.req.param('routeKey')
        }),
      {
        resource: 'project-route',
        resourceId: c.req.param('routeKey'),
        projectId: c.req.param('projectId'),
        routeKey: c.req.param('routeKey')
      }
    )
  );

  app.post('/projects/:projectId/resolve', (c) =>
    jsonWithConfigCenterError(c, () => service.resolveProject(c.req.param('projectId')), {
      resource: 'project-binding',
      resourceId: c.req.param('projectId'),
      projectId: c.req.param('projectId')
    })
  );

  app.post('/plugins/:pluginId/resolve', async (c) => {
    const projectId = c.req.query('projectId');

    if (!projectId) {
      return c.json(
        buildApiErrorBody({
          error: 'invalid-request',
          message: 'projectId is required',
          resource: 'plugin-instance',
          resourceId: c.req.param('pluginId'),
          retryable: false
        }),
        400
      );
    }

    try {
      const result = service.resolvePlugin({
        projectId,
        pluginId: c.req.param('pluginId')
      });

      return result
        ? c.json(result)
        : c.json(
            buildApiErrorBody({
              error: 'not-found',
              message: `plugin ${c.req.param('pluginId')} not found`,
              resource: 'plugin-instance',
              resourceId: c.req.param('pluginId'),
              projectId,
              retryable: false
            }),
            404
          );
    } catch (error) {
      const mapped = mapConfigCenterError(error, {
        resource: 'project-binding',
        resourceId: projectId,
        projectId
      });
      return c.json(mapped.body, mapped.status);
    }
  });

  return app;
};
