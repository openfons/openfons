import { describe, expect, it } from 'vitest';
import {
  ConfigValidationResultSchema,
  MaskedResolvedRuntimeConfigSchema,
  PluginInstanceSchema,
  PluginSpecSchema,
  PluginTypeSchema,
  ProjectBindingSchema,
  ResolvedRuntimeConfigSchema,
  SecretRefSchema
} from '@openfons/contracts';

describe('@openfons/contracts config center schemas', () => {
  it('parses plugin, binding, validation, and raw or masked runtime outputs', () => {
    const secretRef = SecretRefSchema.parse({
      scheme: 'secret',
      scope: 'project',
      projectId: 'openfons',
      name: 'google-api-key'
    });

    const pluginType = PluginTypeSchema.parse({
      id: 'search-provider',
      displayName: 'Search Provider',
      description: 'Discovery provider used by SearchGateway.',
      allowDrivers: ['google', 'ddg'],
      allowDependencies: ['proxy-source']
    });

    const pluginSpec = PluginSpecSchema.parse({
      type: 'search-provider',
      driver: 'google',
      requiredConfigFields: [],
      optionalConfigFields: ['endpoint'],
      secretFields: ['apiKeyRef', 'cxRef'],
      allowedDependencyTypes: ['proxy-source'],
      healthCheckKinds: ['credential', 'http']
    });

    const pluginInstance = PluginInstanceSchema.parse({
      id: 'google-default',
      type: 'search-provider',
      driver: 'google',
      enabled: true,
      scope: 'global',
      config: {
        endpoint: 'https://customsearch.googleapis.com/customsearch/v1'
      },
      secrets: {
        apiKeyRef: secretRef,
        cxRef: {
          scheme: 'secret',
          scope: 'project',
          projectId: 'openfons',
          name: 'google-cx'
        }
      },
      dependencies: [
        {
          type: 'proxy-source',
          pluginId: 'global-proxy-pool'
        }
      ],
      policy: {
        defaultPurpose: 'planning'
      },
      healthCheck: {
        kind: 'credential',
        timeoutMs: 3000
      }
    });

    const binding = ProjectBindingSchema.parse({
      projectId: 'openfons',
      enabledPlugins: [
        'google-default',
        'ddg-default',
        'pinchtab-local',
        'local-browser-default',
        'youtube-adapter',
        'tiktok-adapter',
        'tiktok-account-main',
        'tiktok-cookie-main',
        'global-proxy-pool'
      ],
      roles: {
        primarySearch: 'google-default',
        fallbackSearch: ['ddg-default'],
        defaultBrowser: 'local-browser-default',
        authenticatedBrowser: 'pinchtab-local',
        defaultProxy: 'global-proxy-pool'
      },
      routes: {
        youtube: {
          discovery: ['google-default', 'ddg-default'],
          collection: 'youtube-adapter',
          proxy: 'global-proxy-pool',
          mode: 'public-first'
        },
        tiktok: {
          discovery: ['google-default', 'ddg-default'],
          browser: 'pinchtab-local',
          collection: 'tiktok-adapter',
          accounts: ['tiktok-account-main'],
          cookies: ['tiktok-cookie-main'],
          proxy: 'global-proxy-pool',
          mode: 'requires-auth'
        }
      },
      overrides: {}
    });

    const validation = ConfigValidationResultSchema.parse({
      status: 'valid',
      errors: [],
      warnings: [],
      skipped: [],
      checkedPluginIds: ['google-default', 'ddg-default']
    });

    const rawRuntime = ResolvedRuntimeConfigSchema.parse({
      projectId: 'openfons',
      roles: {
        primarySearch: {
          pluginId: 'google-default',
          type: 'search-provider',
          driver: 'google',
          config: {},
          secrets: {
            apiKeyRef: {
              valueSource: 'secret',
              configured: true,
              value: 'google-key'
            }
          }
        }
      },
      routes: {}
    });

    const maskedRuntime = MaskedResolvedRuntimeConfigSchema.parse({
      projectId: 'openfons',
      roles: {
        primarySearch: {
          pluginId: 'google-default',
          type: 'search-provider',
          driver: 'google',
          config: {},
          secrets: {
            apiKeyRef: {
              valueSource: 'secret',
              configured: true,
              resolved: true,
              summary: 'secret://project/openfons/google-api-key'
            }
          }
        }
      },
      routes: {
        tiktok: {
          mode: 'requires-auth',
          browser: {
            pluginId: 'pinchtab-local',
            type: 'browser-runtime',
            driver: 'pinchtab',
            config: {
              baseUrl: 'http://127.0.0.1:3901',
              allowedDomains: ['tiktok.com', 'www.tiktok.com']
            },
            secrets: {
              tokenRef: {
                valueSource: 'secret',
                configured: true,
                resolved: true,
                summary: 'secret://project/openfons/pinchtab-token'
              }
            }
          }
        }
      }
    });

    expect(pluginType.id).toBe('search-provider');
    expect(pluginSpec.driver).toBe('google');
    expect(pluginInstance.secrets.apiKeyRef.name).toBe('google-api-key');
    expect(binding.routes.tiktok.browser).toBe('pinchtab-local');
    expect(validation.checkedPluginIds).toEqual(['google-default', 'ddg-default']);
    expect(rawRuntime.roles.primarySearch.secrets.apiKeyRef.value).toBe('google-key');
    expect(maskedRuntime.routes.tiktok.browser?.driver).toBe('pinchtab');
  });
});
