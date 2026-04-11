import { describe, expect, it } from 'vitest';
import {
  ConfigWriteResultSchema,
  PluginInstanceSchema,
  PluginWriteRequestSchema,
  ProjectBindingSchema,
  ProjectBindingWriteRequestSchema,
  RepoConfigRevisionSchema
} from '@openfons/contracts';

describe('@openfons/contracts config-center write schemas', () => {
  it('parses revisions, write requests, and write results', () => {
    const revision = RepoConfigRevisionSchema.parse({
      etag: 'sha256:abc',
      updatedAt: '2026-04-11T16:00:00.000Z'
    });

    const plugin = PluginInstanceSchema.parse({
      id: 'google-default',
      type: 'search-provider',
      driver: 'google',
      enabled: true,
      config: {},
      secrets: {},
      dependencies: [],
      policy: {},
      meta: {
        updatedAt: '2026-04-11T16:00:00.000Z',
        updatedBy: 'control-api'
      }
    });

    const binding = ProjectBindingSchema.parse({
      projectId: 'openfons',
      enabledPlugins: ['google-default'],
      roles: { primarySearch: 'google-default' },
      routes: {},
      overrides: {},
      meta: {
        updatedAt: '2026-04-11T16:00:00.000Z'
      }
    });

    const pluginRequest = PluginWriteRequestSchema.parse({
      expectedRevision: revision.etag,
      dryRun: true,
      plugin
    });

    const bindingRequest = ProjectBindingWriteRequestSchema.parse({
      expectedRevision: revision.etag,
      dryRun: false,
      binding
    });

    const result = ConfigWriteResultSchema.parse({
      status: 'dry-run',
      resource: 'plugin-instance',
      resourceId: 'google-default',
      changed: true,
      revision,
      validation: {
        status: 'valid',
        errors: [],
        warnings: [],
        skipped: [],
        checkedPluginIds: ['google-default']
      },
      backupFile: undefined,
      lockWaitMs: 0
    });

    expect(pluginRequest.plugin.meta?.updatedBy).toBe('control-api');
    expect(bindingRequest.binding.meta?.updatedAt).toBe(
      '2026-04-11T16:00:00.000Z'
    );
    expect(result.resource).toBe('plugin-instance');
  });
});
