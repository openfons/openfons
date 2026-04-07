# Platform Plugin Config Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a platform-level plugin config center that unifies plugin instances, secret references, project bindings, validation, and runtime resolution for `search-gateway`, authenticated browser flows, and future crawler adapters.

**Architecture:** Keep plugin categories built in for `v1`, keep repo-visible config under `config/plugins/**` and `config/projects/**`, and keep raw secrets outside the repo under `~/.openfons/secrets/**`. The shared config-center package must expose two distinct outputs: an internal runtime resolver that may hold raw resolved secrets for backend-only consumers, and masked management views that are safe for `control-api` HTTP responses. To avoid cross-service coupling, `search-gateway`, authenticated browser flows, and crawler registries must all consume shared runtime helpers from `packages/config-center`, not import another service's `src/` tree. Roll out in four batches: shared contracts/core, `control-api` management API, `search-gateway` plus browser-runtime integration, and finally crawler-adapter integration.

**Tech Stack:** TypeScript, pnpm workspaces, Zod, Hono, Vitest, JSON config files under `config/plugins/**`, local private secret files under `~/.openfons/secrets/**`.

---

## File Map

### Existing files to modify

- `packages/contracts/src/index.ts`
  Export config-center schemas and inferred types from a dedicated module.
- `services/control-api/src/app.ts`
  Mount config-center management routes after batch 2.
- `services/control-api/src/collection/search-client.ts`
  Stop assembling provider adapters from raw env after batch 3 and consume shared runtime helpers instead of cross-service imports.
- `services/control-api/src/collection/authenticated-local-browser/index.ts`
  Consume resolved browser-runtime bindings after batch 3.
- `services/control-api/src/collection/real-collection-bridge.ts`
  Read resolved crawler/runtime dependencies after batch 4 when collection adapters are introduced.
- `services/search-gateway/src/config.ts`
  Replace env-only adapter assembly with config-center-backed runtime assembly after batch 3.
- `services/search-gateway/src/server.ts`
  Instantiate runtime gateway and provider status from resolved project config.
- `tests/contract/contracts-schema.test.ts`
  Re-export coverage for the new contract module.
- `tests/integration/search-gateway-runtime.test.ts`
  Move runtime tests from env-backed setup to config-center-backed setup.
- `tests/integration/authenticated-local-browser.test.ts`
  Prove browser planning consumes configured browser runtimes instead of hard-coded assumptions.
- `tsconfig.base.json`
  Add the `@openfons/config-center` workspace alias.

### New package files

- `packages/contracts/src/config-center.ts`
  Shared config-center Zod schemas and types.
- `packages/config-center/package.json`
  Workspace package manifest for the shared config-center core.
- `packages/config-center/tsconfig.json`
  Typecheck configuration.
- `packages/config-center/tsconfig.build.json`
  Build declaration configuration.
- `packages/config-center/src/index.ts`
  Public package entrypoint.
- `packages/config-center/src/spec-registry.ts`
  Built-in plugin categories and driver-family specs.
- `packages/config-center/src/config-paths.ts`
  Deterministic repo config and secret-root path resolution helpers.
- `packages/config-center/src/loader.ts`
  Repo-visible plugin-instance and project-binding loading.
- `packages/config-center/src/secret-store.ts`
  Local private secret resolution and secret existence checks.
- `packages/config-center/src/masking.ts`
  Masked management views and secret summaries safe for APIs.
- `packages/config-center/src/validator.ts`
  Structured validation with `valid / degraded / invalid` status.
- `packages/config-center/src/resolver.ts`
  Generic runtime resolution plus route/role lookup helpers for downstream consumers.
- `packages/config-center/src/runtime/search.ts`
  Shared backend-only search-provider runtime helper with raw resolved secrets.
- `packages/config-center/src/runtime/browser.ts`
  Shared backend-only browser-runtime route helper.
- `packages/config-center/src/runtime/crawler.ts`
  Shared backend-only crawler route helper that expands collection/browser/account/cookie/proxy bindings.

### New config files

- `config/plugins/instances/google-default.json`
- `config/plugins/instances/ddg-default.json`
- `config/plugins/instances/local-browser-default.json`
- `config/plugins/instances/pinchtab-local.json`
- `config/plugins/instances/youtube-adapter.json`
- `config/plugins/instances/tiktok-adapter.json`
- `config/plugins/instances/tiktok-account-main.json`
- `config/plugins/instances/tiktok-cookie-main.json`
- `config/plugins/instances/global-proxy-pool.json`
- `config/projects/openfons/plugins/bindings.json`
  Seed repo-visible plugin instances and the first project binding used by tests.

### New control-api files

- `services/control-api/src/config-center/service.ts`
  Creates the package-level loader/validator/resolver dependencies for `control-api`.
- `services/control-api/src/config-center/router.ts`
  Admin-safe config-center HTTP wrappers returning masked views.

### New crawler-adapter files for batch 4

- `services/control-api/src/collection/crawler-adapters/types.ts`
  Shared crawler adapter runtime shapes.
- `services/control-api/src/collection/crawler-adapters/registry.ts`
  Build route-aware crawler adapters from resolved project config.
- `services/control-api/src/collection/crawler-adapters/youtube-yt-dlp.ts`
- `services/control-api/src/collection/crawler-adapters/twitter-twscrape.ts`
- `services/control-api/src/collection/crawler-adapters/tiktok-api.ts`
- `services/control-api/src/collection/crawler-adapters/reddit-praw.ts`
- `services/control-api/src/collection/crawler-adapters/media-crawler-bridge.ts`
  Driver-specific adapter factories that consume resolved runtime config instead of raw env.

### New tests

- `tests/contract/config-center-schema.test.ts`
  Contract coverage for `PluginType`, `PluginSpec`, `PluginInstance`, `SecretRef`, `ProjectBinding`, validation, and resolved runtime outputs.
- `tests/integration/config-center-loader.test.ts`
  Loader and secret-store coverage using the seed config plus temp secret files.
- `tests/integration/config-center-resolver.test.ts`
  Validation and runtime resolution coverage for search/browser/crawler bindings.
- `tests/integration/control-api-config-center.test.ts`
  Masked management API coverage.
- `tests/integration/crawler-adapter-config-center.test.ts`
  Crawler adapter integration coverage for `yt-dlp`, `twscrape`, `TikTokApi`, `PRAW`, and `MediaCrawler` bridge selection.

### Batch 2 Scope

The design doc lists repo-backed mutation APIs for plugin instances and project bindings. This plan keeps batch 2 read-only plus validation and masked resolution. File-backed mutation endpoints are explicitly deferred until there is a locking and concurrent-write story for repo config. Batch 2 therefore includes:

- `GET /api/v1/config/plugin-types`
- `GET /api/v1/config/plugin-types/:typeId`
- `GET /api/v1/config/plugins`
- `GET /api/v1/config/plugins/:pluginId`
- `GET /api/v1/config/projects/:projectId/bindings`
- `POST /api/v1/config/validate`
- `POST /api/v1/config/projects/:projectId/validate`
- `POST /api/v1/config/projects/:projectId/resolve`
- `POST /api/v1/config/plugins/:pluginId/resolve`

---

### Task 1: Batch 1 - Contracts And Shared Config-Center Core

**Files:**
- Create: `packages/contracts/src/config-center.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/config-center/package.json`
- Create: `packages/config-center/tsconfig.json`
- Create: `packages/config-center/tsconfig.build.json`
- Create: `packages/config-center/src/index.ts`
- Create: `packages/config-center/src/spec-registry.ts`
- Create: `packages/config-center/src/config-paths.ts`
- Create: `packages/config-center/src/loader.ts`
- Create: `packages/config-center/src/secret-store.ts`
- Create: `packages/config-center/src/masking.ts`
- Create: `packages/config-center/src/validator.ts`
- Create: `packages/config-center/src/resolver.ts`
- Create: `packages/config-center/src/runtime/search.ts`
- Create: `packages/config-center/src/runtime/browser.ts`
- Create: `packages/config-center/src/runtime/crawler.ts`
- Modify: `tsconfig.base.json`
- Create: `config/plugins/instances/google-default.json`
- Create: `config/plugins/instances/ddg-default.json`
- Create: `config/plugins/instances/local-browser-default.json`
- Create: `config/plugins/instances/pinchtab-local.json`
- Create: `config/plugins/instances/youtube-adapter.json`
- Create: `config/plugins/instances/tiktok-adapter.json`
- Create: `config/plugins/instances/tiktok-account-main.json`
- Create: `config/plugins/instances/tiktok-cookie-main.json`
- Create: `config/plugins/instances/global-proxy-pool.json`
- Create: `config/projects/openfons/plugins/bindings.json`
- Test: `tests/contract/config-center-schema.test.ts`
- Test: `tests/integration/config-center-loader.test.ts`
- Test: `tests/integration/config-center-resolver.test.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
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
  it('parses platform plugin config center contracts', () => {
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

    const secretRef = SecretRefSchema.parse({
      scheme: 'secret',
      scope: 'project',
      projectId: 'openfons',
      name: 'google-api-key'
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
      dependencies: [],
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
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run: `pnpm exec vitest run tests/contract/config-center-schema.test.ts`
Expected: FAIL with missing exports such as `PluginInstanceSchema`, `ConfigValidationResultSchema`, `ResolvedRuntimeConfigSchema`, or `MaskedResolvedRuntimeConfigSchema`.

- [ ] **Step 3: Add the config-center contracts**

```ts
// packages/contracts/src/config-center.ts
import { z } from 'zod';

export const PluginTypeIdSchema = z.enum([
  'search-provider',
  'browser-runtime',
  'crawler-adapter',
  'account-source',
  'cookie-source',
  'proxy-source'
]);

export const SecretScopeSchema = z.enum(['project', 'global']);
export const SecretRefSchema = z
  .object({
    scheme: z.literal('secret'),
    scope: SecretScopeSchema,
    projectId: z.string().min(1).optional(),
    name: z.string().min(1)
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'project' && !value.projectId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['projectId'],
        message: 'project scope secret refs must include projectId'
      });
    }
  });

export const PluginDependencySchema = z.object({
  type: PluginTypeIdSchema,
  pluginId: z.string().min(1)
});

export const PluginTypeSchema = z.object({
  id: PluginTypeIdSchema,
  displayName: z.string().min(1),
  description: z.string().min(1),
  allowDrivers: z.array(z.string().min(1)).min(1),
  allowDependencies: z.array(PluginTypeIdSchema)
});

export const PluginSpecSchema = z.object({
  type: PluginTypeIdSchema,
  driver: z.string().min(1),
  requiredConfigFields: z.array(z.string().min(1)),
  optionalConfigFields: z.array(z.string().min(1)),
  secretFields: z.array(z.string().min(1)),
  allowedDependencyTypes: z.array(PluginTypeIdSchema),
  healthCheckKinds: z.array(z.string().min(1))
});

export const PluginInstanceSchema = z.object({
  id: z.string().min(1),
  type: PluginTypeIdSchema,
  driver: z.string().min(1),
  enabled: z.boolean(),
  scope: z.enum(['global', 'project']).default('global'),
  config: z.record(z.string(), z.unknown()).default({}),
  secrets: z.record(z.string(), SecretRefSchema).default({}),
  dependencies: z.array(PluginDependencySchema).default([]),
  policy: z.record(z.string(), z.unknown()).default({}),
  healthCheck: z
    .object({
      kind: z.string().min(1),
      timeoutMs: z.number().int().positive().optional()
    })
    .optional()
});

export const ProjectRouteBindingSchema = z.object({
  discovery: z.array(z.string().min(1)).optional(),
  browser: z.string().min(1).optional(),
  collection: z.string().min(1).optional(),
  accounts: z.array(z.string().min(1)).optional(),
  cookies: z.array(z.string().min(1)).optional(),
  proxy: z.string().min(1).optional(),
  mode: z.enum(['public-first', 'requires-auth'])
});

export const ProjectBindingSchema = z.object({
  projectId: z.string().min(1),
  enabledPlugins: z.array(z.string().min(1)),
  roles: z.record(z.string(), z.union([z.string().min(1), z.array(z.string().min(1))])),
  routes: z.record(z.string(), ProjectRouteBindingSchema),
  overrides: z.record(z.string(), z.unknown()).default({})
});

export const ConfigIssueSchema = z.object({
  severity: z.enum(['block', 'degrade', 'warn', 'skip']),
  code: z.string().min(1),
  pluginId: z.string().min(1).optional(),
  field: z.string().min(1).optional(),
  message: z.string().min(1)
});

export const ConfigValidationResultSchema = z.object({
  status: z.enum(['valid', 'degraded', 'invalid']),
  errors: z.array(ConfigIssueSchema).default([]),
  warnings: z.array(ConfigIssueSchema).default([]),
  skipped: z.array(ConfigIssueSchema).default([]),
  checkedPluginIds: z.array(z.string().min(1)).default([])
});

export const ResolvedSecretValueSchema = z.object({
  valueSource: z.enum(['secret', 'inline']),
  configured: z.literal(true),
  value: z.unknown()
});

export const MaskedSecretValueSchema = z.object({
  valueSource: z.enum(['secret', 'inline', 'none']),
  configured: z.boolean(),
  resolved: z.boolean(),
  summary: z.string().min(1).optional()
});

const ResolvedPluginBaseSchema = z.object({
  pluginId: z.string().min(1),
  type: PluginTypeIdSchema,
  driver: z.string().min(1),
  config: z.record(z.string(), z.unknown()).default({})
});

export const ResolvedPluginRuntimeSchema = ResolvedPluginBaseSchema.extend({
  secrets: z.record(z.string(), ResolvedSecretValueSchema).default({})
});

export const MaskedResolvedPluginRuntimeSchema = ResolvedPluginBaseSchema.extend({
  secrets: z.record(z.string(), MaskedSecretValueSchema).default({})
});

const ResolvedRoleValueSchema = z.union([
  ResolvedPluginRuntimeSchema,
  z.array(ResolvedPluginRuntimeSchema)
]);

const MaskedResolvedRoleValueSchema = z.union([
  MaskedResolvedPluginRuntimeSchema,
  z.array(MaskedResolvedPluginRuntimeSchema)
]);

export const ResolvedRouteRuntimeSchema = z.object({
  mode: z.enum(['public-first', 'requires-auth']),
  discovery: z.array(ResolvedPluginRuntimeSchema).optional(),
  browser: ResolvedPluginRuntimeSchema.optional(),
  collection: ResolvedPluginRuntimeSchema.optional(),
  accounts: z.array(ResolvedPluginRuntimeSchema).optional(),
  cookies: z.array(ResolvedPluginRuntimeSchema).optional(),
  proxy: ResolvedPluginRuntimeSchema.optional()
});

export const MaskedResolvedRouteRuntimeSchema = z.object({
  mode: z.enum(['public-first', 'requires-auth']),
  discovery: z.array(MaskedResolvedPluginRuntimeSchema).optional(),
  browser: MaskedResolvedPluginRuntimeSchema.optional(),
  collection: MaskedResolvedPluginRuntimeSchema.optional(),
  accounts: z.array(MaskedResolvedPluginRuntimeSchema).optional(),
  cookies: z.array(MaskedResolvedPluginRuntimeSchema).optional(),
  proxy: MaskedResolvedPluginRuntimeSchema.optional()
});

export const ResolvedRuntimeConfigSchema = z.object({
  projectId: z.string().min(1),
  roles: z.record(z.string(), ResolvedRoleValueSchema),
  routes: z.record(z.string(), ResolvedRouteRuntimeSchema)
});

export const MaskedResolvedRuntimeConfigSchema = z.object({
  projectId: z.string().min(1),
  roles: z.record(z.string(), MaskedResolvedRoleValueSchema),
  routes: z.record(z.string(), MaskedResolvedRouteRuntimeSchema)
});

export type PluginTypeId = z.infer<typeof PluginTypeIdSchema>;
export type SecretRef = z.infer<typeof SecretRefSchema>;
export type PluginInstance = z.infer<typeof PluginInstanceSchema>;
export type ProjectBinding = z.infer<typeof ProjectBindingSchema>;
export type ConfigIssue = z.infer<typeof ConfigIssueSchema>;
export type ConfigValidationResult = z.infer<typeof ConfigValidationResultSchema>;
export type ResolvedPluginRuntime = z.infer<typeof ResolvedPluginRuntimeSchema>;
export type MaskedResolvedPluginRuntime = z.infer<
  typeof MaskedResolvedPluginRuntimeSchema
>;
export type ResolvedRuntimeConfig = z.infer<typeof ResolvedRuntimeConfigSchema>;
export type MaskedResolvedRuntimeConfig = z.infer<
  typeof MaskedResolvedRuntimeConfigSchema
>;
```

```ts
// packages/contracts/src/index.ts
export * from './config-center.js';
```

- [ ] **Step 4: Re-run the contract test to verify it passes**

Run: `pnpm exec vitest run tests/contract/config-center-schema.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing core integration test**

```ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildMaskedPluginInstanceView,
  loadConfigCenterState,
  resolveBrowserRouteRuntime,
  resolveCrawlerRouteRuntime,
  resolveProjectRuntimeConfig,
  resolveSearchRuntime,
  validateProjectConfig
} from '@openfons/config-center';

describe('config-center core', () => {
  const createSecretRoot = () => {
    const secretRoot = mkdtempSync(
      path.join(os.tmpdir(), 'openfons-config-center-')
    );
    const projectSecretDir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(projectSecretDir, { recursive: true });
    writeFileSync(path.join(projectSecretDir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(projectSecretDir, 'google-cx'), 'google-cx');
    writeFileSync(path.join(projectSecretDir, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(path.join(projectSecretDir, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(projectSecretDir, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'not-for-repo' })
    );
    writeFileSync(
      path.join(projectSecretDir, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );
    return secretRoot;
  };

  it('separates raw runtime resolution from masked management views', () => {
    const secretRoot = createSecretRoot();
    const state = loadConfigCenterState({ repoRoot: process.cwd(), secretRoot });
    const rawRuntime = resolveProjectRuntimeConfig({ state, projectId: 'openfons' });
    const maskedGoogle = buildMaskedPluginInstanceView({
      plugin: state.pluginInstances.find((item) => item.id === 'google-default')!,
      secretRoot
    });

    expect(rawRuntime.roles.primarySearch.driver).toBe('google');
    expect(rawRuntime.roles.primarySearch.secrets.apiKeyRef.value).toBe('google-key');
    expect(maskedGoogle.secrets.apiKeyRef.configured).toBe(true);
    expect(JSON.stringify(maskedGoogle)).not.toContain('google-key');
  });

  it('validates project closure only and ignores unreferenced plugin instances', () => {
    const baseState = loadConfigCenterState({
      repoRoot: process.cwd(),
      secretRoot: createSecretRoot()
    });
    const validation = validateProjectConfig({
      state: {
        ...baseState,
        pluginInstances: [
          ...baseState.pluginInstances,
          {
            id: 'unused-twitter-cookie',
            type: 'cookie-source',
            driver: 'netscape-cookie-file',
            enabled: true,
            scope: 'project',
            config: {},
            secrets: {
              sessionRef: {
                scheme: 'secret',
                scope: 'project',
                projectId: 'openfons',
                name: 'missing-twitter-cookie'
              }
            },
            dependencies: [],
            policy: {}
          }
        ]
      },
      projectId: 'openfons'
    });

    expect(validation.status).toBe('valid');
    expect(validation.checkedPluginIds).not.toContain('unused-twitter-cookie');
  });

  it('resolves search, browser, and crawler slices from shared runtime helpers', () => {
    const secretRoot = createSecretRoot();
    const state = loadConfigCenterState({ repoRoot: process.cwd(), secretRoot });

    const validation = validateProjectConfig({ state, projectId: 'openfons' });
    const search = resolveSearchRuntime({ state, projectId: 'openfons' });
    const browser = resolveBrowserRouteRuntime({
      state,
      projectId: 'openfons',
      routeKey: 'tiktok'
    });
    const crawler = resolveCrawlerRouteRuntime({
      state,
      projectId: 'openfons',
      routeKey: 'tiktok'
    });

    expect(validation.status).toBe('valid');
    expect(search.providers.map((item) => item.pluginId)).toContain('google-default');
    expect(browser.pluginId).toBe('pinchtab-local');
    expect(crawler.collection.pluginId).toBe('tiktok-adapter');
  });
});
```

- [ ] **Step 6: Run the core integration tests to verify they fail**

Run:
`pnpm exec vitest run tests/integration/config-center-loader.test.ts tests/integration/config-center-resolver.test.ts`
Expected: FAIL with missing package `@openfons/config-center`, missing helper exports, or validator/resolver still collapsing raw and masked outputs into one shape.

- [ ] **Step 7: Scaffold the shared config-center package**

```json
// packages/config-center/package.json
{
  "name": "@openfons/config-center",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "dependencies": {
    "@openfons/contracts": "workspace:*"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "lint": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

```json
// packages/config-center/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src/**/*"]
}
```

```json
// packages/config-center/tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "rootDir": "src",
    "outDir": "dist",
    "paths": {}
  }
}
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "paths": {
      "@openfons/shared": ["packages/shared/src/index.ts"],
      "@openfons/domain-models": ["packages/domain-models/src/index.ts"],
      "@openfons/contracts": ["packages/contracts/src/index.ts"],
      "@openfons/search-gateway": ["packages/search-gateway/src/index.ts"],
      "@openfons/config-center": ["packages/config-center/src/index.ts"]
    }
  }
}
```

- [ ] **Step 8: Add the built-in type registry and path helpers**

```ts
// packages/config-center/src/spec-registry.ts
import type { PluginSpec, PluginType, PluginTypeId } from '@openfons/contracts';

export const BUILTIN_PLUGIN_TYPES: PluginType[] = [
  {
    id: 'search-provider',
    displayName: 'Search Provider',
    description: 'Discovery provider used by SearchGateway.',
    allowDrivers: ['google', 'ddg', 'bing', 'baidu', 'brave', 'tavily'],
    allowDependencies: ['proxy-source']
  },
  {
    id: 'browser-runtime',
    displayName: 'Browser Runtime',
    description: 'Browser runtime used for operator-assisted capture.',
    allowDrivers: ['local-playwright', 'pinchtab'],
    allowDependencies: ['proxy-source', 'cookie-source', 'account-source']
  },
  {
    id: 'crawler-adapter',
    displayName: 'Crawler Adapter',
    description: 'External collection adapter such as yt-dlp or twscrape.',
    allowDrivers: ['yt-dlp', 'twscrape', 'tiktok-api', 'praw', 'media-crawler'],
    allowDependencies: [
      'browser-runtime',
      'account-source',
      'cookie-source',
      'proxy-source'
    ]
  },
  {
    id: 'account-source',
    displayName: 'Account Source',
    description: 'Account pools or credential files used by crawler adapters.',
    allowDrivers: ['credentials-file'],
    allowDependencies: []
  },
  {
    id: 'cookie-source',
    displayName: 'Cookie Source',
    description: 'Cookie/session exports used by crawler adapters.',
    allowDrivers: ['netscape-cookie-file'],
    allowDependencies: []
  },
  {
    id: 'proxy-source',
    displayName: 'Proxy Source',
    description: 'Static or rotating proxy pools.',
    allowDrivers: ['static-proxy-file'],
    allowDependencies: []
  }
];

export const BUILTIN_PLUGIN_SPECS: PluginSpec[] = [
  {
    type: 'search-provider',
    driver: 'google',
    requiredConfigFields: [],
    optionalConfigFields: ['endpoint'],
    secretFields: ['apiKeyRef', 'cxRef'],
    allowedDependencyTypes: ['proxy-source'],
    healthCheckKinds: ['credential', 'http']
  },
  {
    type: 'search-provider',
    driver: 'ddg',
    requiredConfigFields: [],
    optionalConfigFields: ['endpoint'],
    secretFields: [],
    allowedDependencyTypes: ['proxy-source'],
    healthCheckKinds: ['none']
  },
  {
    type: 'browser-runtime',
    driver: 'pinchtab',
    requiredConfigFields: ['baseUrl', 'allowedDomains'],
    optionalConfigFields: ['profile'],
    secretFields: ['tokenRef'],
    allowedDependencyTypes: ['proxy-source', 'cookie-source', 'account-source'],
    healthCheckKinds: ['credential', 'http']
  },
  {
    type: 'browser-runtime',
    driver: 'local-playwright',
    requiredConfigFields: ['allowedDomains'],
    optionalConfigFields: ['headless'],
    secretFields: [],
    allowedDependencyTypes: [],
    healthCheckKinds: ['none']
  },
  {
    type: 'crawler-adapter',
    driver: 'yt-dlp',
    requiredConfigFields: [],
    optionalConfigFields: ['format'],
    secretFields: [],
    allowedDependencyTypes: ['proxy-source'],
    healthCheckKinds: ['none']
  },
  {
    type: 'crawler-adapter',
    driver: 'tiktok-api',
    requiredConfigFields: ['region'],
    optionalConfigFields: [],
    secretFields: [],
    allowedDependencyTypes: [
      'browser-runtime',
      'account-source',
      'cookie-source',
      'proxy-source'
    ],
    healthCheckKinds: ['none']
  },
  {
    type: 'account-source',
    driver: 'credentials-file',
    requiredConfigFields: [],
    optionalConfigFields: [],
    secretFields: ['accountRef'],
    allowedDependencyTypes: [],
    healthCheckKinds: ['credential']
  },
  {
    type: 'cookie-source',
    driver: 'netscape-cookie-file',
    requiredConfigFields: [],
    optionalConfigFields: [],
    secretFields: ['sessionRef'],
    allowedDependencyTypes: [],
    healthCheckKinds: ['credential']
  },
  {
    type: 'proxy-source',
    driver: 'static-proxy-file',
    requiredConfigFields: ['strategy'],
    optionalConfigFields: [],
    secretFields: ['poolRef'],
    allowedDependencyTypes: [],
    healthCheckKinds: ['credential']
  }
];

export const listPluginTypes = () => BUILTIN_PLUGIN_TYPES;
export const getPluginSpec = (type: PluginTypeId, driver: string) =>
  BUILTIN_PLUGIN_SPECS.find(
    (item) => item.type === type && item.driver === driver
  );
```

```ts
// packages/config-center/src/config-paths.ts
import os from 'node:os';
import path from 'node:path';

export const createConfigCenterPaths = ({
  repoRoot,
  secretRoot = process.env.OPENFONS_SECRET_ROOT ??
    path.join(os.homedir(), '.openfons', 'secrets')
}: {
  repoRoot: string;
  secretRoot?: string;
}) => ({
  repoRoot,
  instancesDir: path.join(repoRoot, 'config', 'plugins', 'instances'),
  projectDir: path.join(repoRoot, 'config', 'projects'),
  secretRoot
});
```

- [ ] **Step 9: Add loader, secret-store, validator, resolver, and masking**

```ts
// packages/config-center/src/loader.ts
import fs from 'node:fs';
import path from 'node:path';
import {
  PluginInstanceSchema,
  ProjectBindingSchema,
  type PluginInstance,
  type ProjectBinding
} from '@openfons/contracts';
import { createConfigCenterPaths } from './config-paths.js';

const readJson = <T>(filePath: string): T =>
  JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;

export const loadPluginInstances = ({ repoRoot }: { repoRoot: string }): PluginInstance[] => {
  const { instancesDir } = createConfigCenterPaths({ repoRoot });
  return fs
    .readdirSync(instancesDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => PluginInstanceSchema.parse(readJson(path.join(instancesDir, name))))
    .sort((a, b) => a.id.localeCompare(b.id));
};

export const loadProjectBinding = ({
  repoRoot,
  projectId
}: {
  repoRoot: string;
  projectId: string;
}): ProjectBinding =>
  ProjectBindingSchema.parse(
    readJson(path.join(repoRoot, 'config', 'projects', projectId, 'plugins', 'bindings.json'))
  );

export const loadConfigCenterState = ({
  repoRoot,
  secretRoot
}: {
  repoRoot: string;
  secretRoot?: string;
}) => {
  const paths = createConfigCenterPaths({ repoRoot, secretRoot });

  return {
    repoRoot,
    secretRoot: paths.secretRoot,
    pluginInstances: loadPluginInstances({ repoRoot })
  };
};
```

```ts
// packages/config-center/src/secret-store.ts
import fs from 'node:fs';
import path from 'node:path';
import type { SecretRef } from '@openfons/contracts';

const candidatePathsForSecret = (secretRoot: string, ref: SecretRef) => {
  const prefix =
    ref.scope === 'project'
      ? path.join(secretRoot, 'project', ref.projectId as string, ref.name)
      : path.join(secretRoot, 'global', ref.name);
  return [prefix, `${prefix}.txt`, `${prefix}.json`];
};

export const resolveSecretValue = ({
  secretRoot,
  ref
}: {
  secretRoot: string;
  ref: SecretRef;
}) => {
  const filePath = candidatePathsForSecret(secretRoot, ref).find((candidate) =>
    fs.existsSync(candidate)
  );

  if (!filePath) {
    return { configured: false as const, value: undefined };
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  return {
    configured: true as const,
    value: filePath.endsWith('.json') ? JSON.parse(raw) : raw.trim()
  };
};
```

```ts
// packages/config-center/src/masking.ts
import type {
  MaskedResolvedPluginRuntime,
  PluginInstance,
  SecretRef
} from '@openfons/contracts';
import { resolveSecretValue } from './secret-store.js';

export const maskSecretRef = (ref: SecretRef, configured: boolean) => ({
  valueSource: 'secret' as const,
  configured,
  resolved: configured,
  summary:
    ref.scope === 'project'
      ? `secret://project/${ref.projectId}/${ref.name}`
      : `secret://global/${ref.name}`
});

export const buildMaskedPluginInstanceView = ({
  plugin,
  secretRoot
}: {
  plugin: PluginInstance;
  secretRoot: string;
}): MaskedResolvedPluginRuntime => ({
  pluginId: plugin.id,
  type: plugin.type,
  driver: plugin.driver,
  config: plugin.config,
  secrets: Object.fromEntries(
    Object.entries(plugin.secrets).map(([field, ref]) => [
      field,
      maskSecretRef(
        ref,
        resolveSecretValue({ secretRoot, ref }).configured
      )
    ])
  )
});
```

- [ ] **Step 10: Add validator and resolver implementation**

```ts
// packages/config-center/src/validator.ts
import type {
  ConfigIssue,
  ConfigValidationResult,
  PluginInstance,
  ProjectBinding
} from '@openfons/contracts';
import { loadProjectBinding } from './loader.js';
import { resolveSecretValue } from './secret-store.js';
import { getPluginSpec } from './spec-registry.js';

const collectRoleIds = (roles: ProjectBinding['roles']) =>
  Object.values(roles).flatMap((value) => (Array.isArray(value) ? value : [value]));

const collectRouteIds = (binding: ProjectBinding) =>
  Object.values(binding.routes).flatMap((route) => [
    ...(route.discovery ?? []),
    ...(route.browser ? [route.browser] : []),
    ...(route.collection ? [route.collection] : []),
    ...(route.accounts ?? []),
    ...(route.cookies ?? []),
    ...(route.proxy ? [route.proxy] : [])
  ]);

export const collectProjectClosure = (binding: ProjectBinding) =>
  [
    ...new Set([
      ...binding.enabledPlugins,
      ...collectRoleIds(binding.roles),
      ...collectRouteIds(binding)
    ])
  ];

export const validateProjectConfig = ({
  state,
  projectId
}: {
  state: { repoRoot: string; secretRoot?: string; pluginInstances: PluginInstance[] };
  projectId: string;
}): ConfigValidationResult => {
  const binding = loadProjectBinding({ repoRoot: state.repoRoot, projectId });
  const checkedPluginIds = collectProjectClosure(binding);
  const byId = new Map(state.pluginInstances.map((item) => [item.id, item]));
  const errors: ConfigIssue[] = [];
  const warnings: ConfigIssue[] = [];
  const skipped: ConfigIssue[] = [];

  for (const pluginId of checkedPluginIds) {
    const plugin = byId.get(pluginId);
    if (!plugin) {
      errors.push({
        severity: 'block',
        code: 'unknown_plugin',
        pluginId,
        message: `binding references unknown plugin ${pluginId}`
      });
      continue;
    }

    const spec = getPluginSpec(plugin.type, plugin.driver);
    if (!spec) {
      errors.push({
        severity: 'block',
        code: 'unknown_driver',
        pluginId: plugin.id,
        message: `${plugin.id} uses unsupported driver ${plugin.driver}`
      });
      continue;
    }

    for (const field of spec.secretFields) {
      const ref = plugin.secrets[field];
      if (!ref) {
        errors.push({
          severity: 'block',
          code: 'missing_secret_ref',
          pluginId: plugin.id,
          field,
          message: `${plugin.id} requires ${field}`
        });
        continue;
      }

      const resolved = resolveSecretValue({
        secretRoot: state.secretRoot!,
        ref
      });

      if (!resolved.configured) {
        errors.push({
          severity: 'block',
          code: 'missing_secret_value',
          pluginId: plugin.id,
          field,
          message: `${plugin.id} secret ${field} was not found`
        });
      }
    }
  }

  for (const plugin of state.pluginInstances) {
    if (!checkedPluginIds.includes(plugin.id)) {
      skipped.push({
        severity: 'skip',
        code: 'unused_plugin',
        pluginId: plugin.id,
        message: `${plugin.id} is outside the current project closure`
      });
    }
  }

  return {
    status: errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'degraded' : 'valid',
    errors,
    warnings,
    skipped,
    checkedPluginIds
  };
};
```

```ts
// packages/config-center/src/resolver.ts
import type {
  MaskedResolvedPluginRuntime,
  MaskedResolvedRuntimeConfig,
  PluginInstance,
  ResolvedPluginRuntime,
  ResolvedRuntimeConfig
} from '@openfons/contracts';
import { loadProjectBinding } from './loader.js';
import { buildMaskedPluginInstanceView } from './masking.js';
import { resolveSecretValue } from './secret-store.js';
import { validateProjectConfig } from './validator.js';

const buildMap = (plugins: PluginInstance[]) =>
  new Map(plugins.map((plugin) => [plugin.id, plugin]));

const resolvePluginRaw = ({
  plugin,
  secretRoot
}: {
  plugin: PluginInstance;
  secretRoot: string;
}): ResolvedPluginRuntime => ({
  pluginId: plugin.id,
  type: plugin.type,
  driver: plugin.driver,
  config: plugin.config,
  secrets: Object.fromEntries(
    Object.entries(plugin.secrets).map(([field, ref]) => [
      field,
      {
        valueSource: 'secret',
        configured: true,
        value: resolveSecretValue({ secretRoot, ref }).value
      }
    ])
  )
});

const resolveRoleValue = <T>(
  value: string | string[],
  byId: (pluginId: string) => T
) => (Array.isArray(value) ? value.map(byId) : byId(value));

export const resolveProjectRuntimeConfig = ({
  state,
  projectId
}: {
  state: { repoRoot: string; secretRoot?: string; pluginInstances: PluginInstance[] };
  projectId: string;
}): ResolvedRuntimeConfig => {
  const validation = validateProjectConfig({ state, projectId });
  if (validation.status === 'invalid') {
    throw new Error(
      `config-center validation failed for ${projectId}: ${validation.errors
        .map((item) => item.message)
        .join('; ')}`
    );
  }

  const binding = loadProjectBinding({ repoRoot: state.repoRoot, projectId });
  const secretRoot = state.secretRoot!;
  const plugins = buildMap(state.pluginInstances);
  const byId = (pluginId: string) =>
    resolvePluginRaw({
      plugin: plugins.get(pluginId) as PluginInstance,
      secretRoot
    });

  return {
    projectId,
    roles: Object.fromEntries(
      Object.entries(binding.roles).map(([role, value]) => [role, resolveRoleValue(value, byId)])
    ),
    routes: Object.fromEntries(
      Object.entries(binding.routes).map(([routeKey, route]) => [
        routeKey,
        {
          mode: route.mode,
          discovery: route.discovery?.map(byId),
          browser: route.browser ? byId(route.browser) : undefined,
          collection: route.collection ? byId(route.collection) : undefined,
          accounts: route.accounts?.map(byId),
          cookies: route.cookies?.map(byId),
          proxy: route.proxy ? byId(route.proxy) : undefined
        }
      ])
    )
  };
};

export const resolveMaskedProjectRuntimeConfig = ({
  state,
  projectId
}: {
  state: { repoRoot: string; secretRoot?: string; pluginInstances: PluginInstance[] };
  projectId: string;
}): MaskedResolvedRuntimeConfig => {
  const binding = loadProjectBinding({ repoRoot: state.repoRoot, projectId });
  const plugins = buildMap(state.pluginInstances);
  const byId = (pluginId: string): MaskedResolvedPluginRuntime =>
    buildMaskedPluginInstanceView({
      plugin: plugins.get(pluginId) as PluginInstance,
      secretRoot: state.secretRoot!
    });

  return {
    projectId,
    roles: Object.fromEntries(
      Object.entries(binding.roles).map(([role, value]) => [role, resolveRoleValue(value, byId)])
    ),
    routes: Object.fromEntries(
      Object.entries(binding.routes).map(([routeKey, route]) => [
        routeKey,
        {
          mode: route.mode,
          discovery: route.discovery?.map(byId),
          browser: route.browser ? byId(route.browser) : undefined,
          collection: route.collection ? byId(route.collection) : undefined,
          accounts: route.accounts?.map(byId),
          cookies: route.cookies?.map(byId),
          proxy: route.proxy ? byId(route.proxy) : undefined
        }
      ])
    )
  };
};
```

```ts
// packages/config-center/src/runtime/search.ts
import type { ResolvedPluginRuntime } from '@openfons/contracts';
import { resolveProjectRuntimeConfig } from '../resolver.js';

const asArray = <T>(value: T | T[] | undefined) =>
  !value ? [] : Array.isArray(value) ? value : [value];

export const resolveSearchRuntime = ({
  state,
  projectId
}: {
  state: { repoRoot: string; secretRoot?: string; pluginInstances: unknown[] };
  projectId: string;
}) => {
  const runtime = resolveProjectRuntimeConfig({ state, projectId });
  const providers = [
    ...asArray(runtime.roles.primarySearch),
    ...asArray(runtime.roles.fallbackSearch),
    ...Object.values(runtime.routes).flatMap((route) => route.discovery ?? [])
  ].filter(
    (plugin, index, items) =>
      items.findIndex((candidate) => candidate.pluginId === plugin.pluginId) === index
  ) as ResolvedPluginRuntime[];

  return { providers };
};
```

```ts
// packages/config-center/src/runtime/browser.ts
import { resolveProjectRuntimeConfig } from '../resolver.js';

export const resolveBrowserRouteRuntime = ({
  state,
  projectId,
  routeKey
}: {
  state: { repoRoot: string; secretRoot?: string; pluginInstances: unknown[] };
  projectId: string;
  routeKey: string;
}) => {
  const runtime = resolveProjectRuntimeConfig({ state, projectId });
  const route = runtime.routes[routeKey];
  if (!route?.browser) {
    throw new Error(`route ${routeKey} does not define a browser runtime`);
  }
  return route.browser;
};
```

```ts
// packages/config-center/src/runtime/crawler.ts
import { resolveProjectRuntimeConfig } from '../resolver.js';

export type ResolvedCrawlerRouteRuntime = {
  routeKey: string;
  mode: 'public-first' | 'requires-auth';
  collection: NonNullable<
    ReturnType<typeof resolveProjectRuntimeConfig>['routes'][string]['collection']
  >;
  browser: ReturnType<typeof resolveProjectRuntimeConfig>['routes'][string]['browser'];
  accounts: NonNullable<ReturnType<typeof resolveProjectRuntimeConfig>['routes'][string]['accounts']>;
  cookies: NonNullable<ReturnType<typeof resolveProjectRuntimeConfig>['routes'][string]['cookies']>;
  proxy: ReturnType<typeof resolveProjectRuntimeConfig>['routes'][string]['proxy'];
};

export const resolveCrawlerRouteRuntime = ({
  state,
  projectId,
  routeKey
}: {
  state: { repoRoot: string; secretRoot?: string; pluginInstances: unknown[] };
  projectId: string;
  routeKey: string;
}) => {
  const runtime = resolveProjectRuntimeConfig({ state, projectId });
  const route = runtime.routes[routeKey];
  if (!route?.collection) {
    throw new Error(`route ${routeKey} does not define a collection adapter`);
  }

  return {
    routeKey,
    mode: route.mode,
    collection: route.collection,
    browser: route.browser,
    accounts: route.accounts ?? [],
    cookies: route.cookies ?? [],
    proxy: route.proxy
  };
};
```

```ts
// packages/config-center/src/index.ts
export * from './config-paths.js';
export * from './loader.js';
export * from './masking.js';
export * from './resolver.js';
export * from './runtime/browser.js';
export * from './runtime/crawler.js';
export * from './runtime/search.js';
export * from './secret-store.js';
export * from './spec-registry.js';
export * from './validator.js';
```

- [ ] **Step 11: Add the seed plugin-instance and binding config**

```json
// config/plugins/instances/google-default.json
{
  "id": "google-default",
  "type": "search-provider",
  "driver": "google",
  "enabled": true,
  "scope": "global",
  "config": {
    "endpoint": "https://customsearch.googleapis.com/customsearch/v1"
  },
  "secrets": {
    "apiKeyRef": {
      "scheme": "secret",
      "scope": "project",
      "projectId": "openfons",
      "name": "google-api-key"
    },
    "cxRef": {
      "scheme": "secret",
      "scope": "project",
      "projectId": "openfons",
      "name": "google-cx"
    }
  },
  "dependencies": [],
  "policy": {
    "defaultPurpose": "planning"
  },
  "healthCheck": {
    "kind": "credential",
    "timeoutMs": 3000
  }
}
```

```json
// config/plugins/instances/ddg-default.json
{
  "id": "ddg-default",
  "type": "search-provider",
  "driver": "ddg",
  "enabled": true,
  "scope": "global",
  "config": {
    "endpoint": "https://duckduckgo.com/html/"
  },
  "secrets": {},
  "dependencies": [],
  "policy": {
    "defaultPurpose": "planning"
  }
}
```

```json
// config/plugins/instances/local-browser-default.json
{
  "id": "local-browser-default",
  "type": "browser-runtime",
  "driver": "local-playwright",
  "enabled": true,
  "scope": "project",
  "config": {
    "headless": true,
    "allowedDomains": [
      "youtube.com",
      "www.youtube.com",
      "tiktok.com",
      "www.tiktok.com"
    ]
  },
  "secrets": {},
  "dependencies": [],
  "policy": {
    "defaultPurpose": "public-capture"
  }
}
```

```json
// config/plugins/instances/pinchtab-local.json
{
  "id": "pinchtab-local",
  "type": "browser-runtime",
  "driver": "pinchtab",
  "enabled": true,
  "scope": "project",
  "config": {
    "baseUrl": "http://127.0.0.1:3901",
    "allowedDomains": ["tiktok.com", "www.tiktok.com"]
  },
  "secrets": {
    "tokenRef": {
      "scheme": "secret",
      "scope": "project",
      "projectId": "openfons",
      "name": "pinchtab-token"
    }
  },
  "dependencies": [],
  "policy": {
    "defaultPurpose": "authenticated-capture"
  }
}
```

```json
// config/plugins/instances/youtube-adapter.json
{
  "id": "youtube-adapter",
  "type": "crawler-adapter",
  "driver": "yt-dlp",
  "enabled": true,
  "scope": "project",
  "config": {
    "format": "json"
  },
  "secrets": {},
  "dependencies": [{ "type": "proxy-source", "pluginId": "global-proxy-pool" }],
  "policy": {
    "mode": "public-first"
  }
}
```

```json
// config/plugins/instances/tiktok-adapter.json
{
  "id": "tiktok-adapter",
  "type": "crawler-adapter",
  "driver": "tiktok-api",
  "enabled": true,
  "scope": "project",
  "config": {
    "region": "us"
  },
  "secrets": {},
  "dependencies": [
    { "type": "browser-runtime", "pluginId": "pinchtab-local" },
    { "type": "account-source", "pluginId": "tiktok-account-main" },
    { "type": "cookie-source", "pluginId": "tiktok-cookie-main" },
    { "type": "proxy-source", "pluginId": "global-proxy-pool" }
  ],
  "policy": {
    "mode": "requires-auth"
  }
}
```

```json
// config/plugins/instances/tiktok-account-main.json
{
  "id": "tiktok-account-main",
  "type": "account-source",
  "driver": "credentials-file",
  "enabled": true,
  "scope": "project",
  "config": {},
  "secrets": {
    "accountRef": {
      "scheme": "secret",
      "scope": "project",
      "projectId": "openfons",
      "name": "tiktok-account-main"
    }
  },
  "dependencies": [],
  "policy": {
    "rotation": "manual"
  }
}
```

```json
// config/plugins/instances/tiktok-cookie-main.json
{
  "id": "tiktok-cookie-main",
  "type": "cookie-source",
  "driver": "netscape-cookie-file",
  "enabled": true,
  "scope": "project",
  "config": {},
  "secrets": {
    "sessionRef": {
      "scheme": "secret",
      "scope": "project",
      "projectId": "openfons",
      "name": "tiktok-cookie-main"
    }
  },
  "dependencies": [],
  "policy": {
    "format": "raw"
  }
}
```

```json
// config/plugins/instances/global-proxy-pool.json
{
  "id": "global-proxy-pool",
  "type": "proxy-source",
  "driver": "static-proxy-file",
  "enabled": true,
  "scope": "project",
  "config": {
    "strategy": "round-robin"
  },
  "secrets": {
    "poolRef": {
      "scheme": "secret",
      "scope": "project",
      "projectId": "openfons",
      "name": "global-proxy-pool"
    }
  },
  "dependencies": [],
  "policy": {
    "allowSharedUse": true
  }
}
```

```json
// config/projects/openfons/plugins/bindings.json
{
  "projectId": "openfons",
  "enabledPlugins": [
    "google-default",
    "ddg-default",
    "pinchtab-local",
    "local-browser-default",
    "youtube-adapter",
    "tiktok-adapter",
    "tiktok-account-main",
    "tiktok-cookie-main",
    "global-proxy-pool"
  ],
  "roles": {
    "primarySearch": "google-default",
    "fallbackSearch": ["ddg-default"],
    "defaultBrowser": "local-browser-default",
    "authenticatedBrowser": "pinchtab-local",
    "defaultProxy": "global-proxy-pool",
    "platformAccount": "tiktok-account-main",
    "platformCookie": "tiktok-cookie-main"
  },
  "routes": {
    "youtube": {
      "discovery": ["google-default", "ddg-default"],
      "collection": "youtube-adapter",
      "proxy": "global-proxy-pool",
      "mode": "public-first"
    },
    "tiktok": {
      "discovery": ["google-default", "ddg-default"],
      "browser": "pinchtab-local",
      "collection": "tiktok-adapter",
      "accounts": ["tiktok-account-main"],
      "cookies": ["tiktok-cookie-main"],
      "proxy": "global-proxy-pool",
      "mode": "requires-auth"
    }
  },
  "overrides": {}
}
```

- [ ] **Step 12: Add the loader and resolver test files**

```ts
// tests/integration/config-center-loader.test.ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildMaskedPluginInstanceView,
  loadConfigCenterState
} from '@openfons/config-center';

describe('config-center loader', () => {
  it('loads repo-visible instances and derives masked configured status from the secret store', () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-loader-'));
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(dir, 'google-cx'), 'google-cx');

    const state = loadConfigCenterState({ repoRoot: process.cwd(), secretRoot });
    const google = state.pluginInstances.find((item) => item.id === 'google-default')!;
    const pinchtab = state.pluginInstances.find((item) => item.id === 'pinchtab-local')!;

    expect(buildMaskedPluginInstanceView({ plugin: google, secretRoot }).secrets.apiKeyRef.configured).toBe(
      true
    );
    expect(buildMaskedPluginInstanceView({ plugin: pinchtab, secretRoot }).secrets.tokenRef.configured).toBe(
      false
    );
  });
});
```

```ts
// tests/integration/config-center-resolver.test.ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadConfigCenterState,
  resolveMaskedProjectRuntimeConfig,
  resolveProjectRuntimeConfig,
  validateProjectConfig
} from '@openfons/config-center';

describe('config-center resolver', () => {
  it('returns raw runtime for backend use and masked runtime for management APIs', () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-resolver-'));
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(dir, 'google-cx'), 'google-cx');
    writeFileSync(path.join(dir, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(path.join(dir, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(dir, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'not-for-repo' })
    );
    writeFileSync(
      path.join(dir, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const state = loadConfigCenterState({ repoRoot: process.cwd(), secretRoot });
    const validation = validateProjectConfig({ state, projectId: 'openfons' });
    const rawRuntime = resolveProjectRuntimeConfig({ state, projectId: 'openfons' });
    const maskedRuntime = resolveMaskedProjectRuntimeConfig({
      state,
      projectId: 'openfons'
    });

    expect(validation.status).toBe('valid');
    expect(rawRuntime.routes.tiktok.browser?.secrets.tokenRef.value).toBe('pinchtab-token');
    expect(maskedRuntime.routes.tiktok.browser?.secrets.tokenRef.summary).toContain(
      'pinchtab-token'
    );
    expect(JSON.stringify(maskedRuntime)).not.toContain('pinchtab-token');
  });
});
```

- [ ] **Step 13: Run the batch 1 test suite**

Run:
`pnpm exec vitest run tests/contract/config-center-schema.test.ts tests/integration/config-center-loader.test.ts tests/integration/config-center-resolver.test.ts`
Expected: PASS

- [ ] **Step 14: Commit**

```bash
git add packages/contracts/src/config-center.ts \
  packages/contracts/src/index.ts \
  packages/config-center \
  config/plugins/instances \
  config/projects/openfons/plugins/bindings.json \
  tests/contract/config-center-schema.test.ts \
  tests/integration/config-center-loader.test.ts \
  tests/integration/config-center-resolver.test.ts \
  tsconfig.base.json
git commit -m "feat(config-center): add shared contracts and core resolver"
```

### Task 2: Batch 2 - Add The Control API Config-Center Management Surface

**Files:**
- Create: `services/control-api/src/config-center/service.ts`
- Create: `services/control-api/src/config-center/router.ts`
- Modify: `services/control-api/src/app.ts`
- Test: `tests/integration/control-api-config-center.test.ts`

- [ ] **Step 1: Write the failing control-api config-center test**

```ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app.js';

describe('control-api config center routes', () => {
  it('returns masked plugin metadata, validation, and resolution views', async () => {
    const incompleteSecretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-control-api-a-'));
    const incompleteDir = path.join(incompleteSecretRoot, 'project', 'openfons');
    mkdirSync(incompleteDir, { recursive: true });
    writeFileSync(path.join(incompleteDir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(incompleteDir, 'google-cx'), 'google-cx');

    const fullSecretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-control-api-b-'));
    const fullDir = path.join(fullSecretRoot, 'project', 'openfons');
    mkdirSync(fullDir, { recursive: true });
    writeFileSync(path.join(fullDir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(fullDir, 'google-cx'), 'google-cx');
    writeFileSync(path.join(fullDir, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(path.join(fullDir, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(fullDir, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'not-for-repo' })
    );
    writeFileSync(
      path.join(fullDir, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const incompleteApp = createApp({
      configCenter: {
        repoRoot: process.cwd(),
        secretRoot: incompleteSecretRoot
      }
    });
    const fullApp = createApp({
      configCenter: {
        repoRoot: process.cwd(),
        secretRoot: fullSecretRoot
      }
    });

    const typesResponse = await incompleteApp.request('/api/v1/config/plugin-types');
    expect(typesResponse.status).toBe(200);

    const pluginTypeDetail = await incompleteApp.request(
      '/api/v1/config/plugin-types/search-provider'
    );
    expect(pluginTypeDetail.status).toBe(200);

    const pluginsResponse = await incompleteApp.request('/api/v1/config/plugins');
    expect(pluginsResponse.status).toBe(200);
    const pluginsBody = await pluginsResponse.json();
    expect(JSON.stringify(pluginsBody)).not.toContain('google-key');
    expect(pluginsBody.plugins.find((item: { id: string }) => item.id === 'pinchtab-local').secrets.tokenRef.configured).toBe(
      false
    );

    const pluginDetail = await incompleteApp.request('/api/v1/config/plugins/google-default');
    expect(pluginDetail.status).toBe(200);

    const bindingResponse = await incompleteApp.request(
      '/api/v1/config/projects/openfons/bindings'
    );
    expect(bindingResponse.status).toBe(200);

    const validateAllResponse = await incompleteApp.request('/api/v1/config/validate', {
      method: 'POST'
    });
    expect(validateAllResponse.status).toBe(200);

    const validateResponse = await incompleteApp.request(
      '/api/v1/config/projects/openfons/validate',
      {
        method: 'POST'
      }
    );
    expect(validateResponse.status).toBe(200);

    const resolveProjectResponse = await fullApp.request(
      '/api/v1/config/projects/openfons/resolve',
      { method: 'POST' }
    );
    expect(resolveProjectResponse.status).toBe(200);
    expect(await resolveProjectResponse.text()).not.toContain('google-key');

    const resolvePluginResponse = await fullApp.request(
      '/api/v1/config/plugins/google-default/resolve?projectId=openfons',
      { method: 'POST' }
    );
    expect(resolvePluginResponse.status).toBe(200);
    expect(await resolvePluginResponse.text()).not.toContain('google-key');
  });
});
```

- [ ] **Step 2: Run the control-api config-center test to verify it fails**

Run: `pnpm exec vitest run tests/integration/control-api-config-center.test.ts`
Expected: FAIL because `createApp` does not yet accept `configCenter` options and `/api/v1/config/**` routes do not exist.

- [ ] **Step 3: Add a config-center service wrapper for control-api**

```ts
// services/control-api/src/config-center/service.ts
import fs from 'node:fs';
import path from 'node:path';
import {
  buildMaskedPluginInstanceView,
  listPluginTypes,
  loadConfigCenterState,
  resolveMaskedProjectRuntimeConfig,
  validateProjectConfig
} from '@openfons/config-center';
import { loadProjectBinding } from '@openfons/config-center';

export const createConfigCenterService = ({
  repoRoot,
  secretRoot
}: {
  repoRoot: string;
  secretRoot?: string;
}) => {
  const loadState = () => loadConfigCenterState({ repoRoot, secretRoot });
  const listProjectIds = () =>
    fs
      .readdirSync(path.join(repoRoot, 'config', 'projects'))
      .filter((name) =>
        fs.existsSync(path.join(repoRoot, 'config', 'projects', name, 'plugins', 'bindings.json'))
      );
  const getPluginMap = () =>
    new Map(loadState().pluginInstances.map((plugin) => [plugin.id, plugin]));

  return {
    listPluginTypes,
    getPluginType: (typeId: string) =>
      listPluginTypes().find((item) => item.id === typeId),
    listPlugins: () => {
      const state = loadState();
      return state.pluginInstances.map((plugin) =>
        buildMaskedPluginInstanceView({ plugin, secretRoot: state.secretRoot! })
      );
    },
    getPlugin: (pluginId: string) => {
      const state = loadState();
      const plugin = getPluginMap().get(pluginId);
      return plugin
        ? buildMaskedPluginInstanceView({ plugin, secretRoot: state.secretRoot! })
        : undefined;
    },
    getProjectBindings: (projectId: string) =>
      loadProjectBinding({ repoRoot, projectId }),
    validateAll: () => {
      const state = loadState();
      return {
        projects: listProjectIds().map((projectId) => ({
          projectId,
          validation: validateProjectConfig({ state, projectId })
        }))
      };
    },
    getProjectValidation: (projectId: string) =>
      validateProjectConfig({ state: loadState(), projectId }),
    resolveProject: (projectId: string) =>
      resolveMaskedProjectRuntimeConfig({ state: loadState(), projectId }),
    resolvePlugin: ({
      projectId,
      pluginId
    }: {
      projectId: string;
      pluginId: string;
    }) => {
      const runtime = resolveMaskedProjectRuntimeConfig({
        state: loadState(),
        projectId
      });
      return (
        Object.values(runtime.roles)
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .find((plugin) => plugin.pluginId === pluginId) ??
        Object.values(runtime.routes)
          .flatMap((route) => [
            ...(route.discovery ?? []),
            ...(route.browser ? [route.browser] : []),
            ...(route.collection ? [route.collection] : []),
            ...(route.accounts ?? []),
            ...(route.cookies ?? []),
            ...(route.proxy ? [route.proxy] : [])
          ])
          .find((plugin) => plugin.pluginId === pluginId)
      );
    }
  };
};
```

- [ ] **Step 4: Add masked config-center routes**

```ts
// services/control-api/src/config-center/router.ts
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
```

- [ ] **Step 5: Mount the config-center router in control-api**

```ts
// services/control-api/src/app.ts
import { createConfigCenterRouter } from './config-center/router.js';

type BuildCompilationOptions = Parameters<typeof buildCompilation>[1] & {
  configCenter?: {
    repoRoot: string;
    secretRoot?: string;
  };
};

export const createApp = (
  options: BuildCompilationOptions = {},
  store: MemoryStore = createMemoryStore()
) => {
  const app = new Hono();

  if (options.configCenter) {
    app.route('/api/v1/config', createConfigCenterRouter(options.configCenter));
  }

  // Keep the existing health, opportunities, compile, and reports routes unchanged below.
```

- [ ] **Step 6: Re-run the control-api config-center test**

Run: `pnpm exec vitest run tests/integration/control-api-config-center.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add services/control-api/src/config-center \
  services/control-api/src/app.ts \
  tests/integration/control-api-config-center.test.ts
git commit -m "feat(control-api): add config center management routes"
```

### Task 3: Batch 3 - Integrate Search Gateway And Browser Runtime

**Files:**
- Modify: `services/search-gateway/src/config.ts`
- Modify: `services/search-gateway/src/server.ts`
- Modify: `services/control-api/src/collection/search-client.ts`
- Create: `services/control-api/src/collection/authenticated-local-browser/runtime.ts`
- Modify: `services/control-api/src/collection/authenticated-local-browser/index.ts`
- Test: `tests/integration/search-gateway-runtime.test.ts`
- Test: `tests/integration/authenticated-local-browser.test.ts`

- [ ] **Step 1: Extend the search-gateway runtime test to use config-center-backed setup**

```ts
// replace the env-backed setup in tests/integration/search-gateway-runtime.test.ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createRuntimeGateway } from '../../services/search-gateway/src/config';
import { createMemoryStore } from '../../services/search-gateway/src/store';

describe('search-gateway runtime wiring', () => {
  it('builds runtime adapters from config-center-resolved provider config', async () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-search-runtime-'));
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(dir, 'google-cx'), 'google-cx');
    writeFileSync(path.join(dir, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(path.join(dir, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(dir, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'not-for-repo' })
    );
    writeFileSync(
      path.join(dir, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        items: [
          {
            title: 'OpenAI API pricing',
            link: 'https://openai.com/api/pricing/',
            snippet: 'Official pricing page'
          }
        ]
      })
    }));

    const gateway = createRuntimeGateway({
      projectId: 'openfons',
      repoRoot: process.cwd(),
      secretRoot,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    const result = await gateway.search({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'openai pricing official',
      providers: ['google'],
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.results[0].provider).toBe('google');
  });

  it('still supports shared run storage when gateways are created from config-center', async () => {
    const store = createMemoryStore();
    const secretRootA = mkdtempSync(path.join(os.tmpdir(), 'openfons-search-a-'));
    const dirA = path.join(secretRootA, 'project', 'openfons');
    mkdirSync(dirA, { recursive: true });
    writeFileSync(path.join(dirA, 'google-api-key'), 'google-key');
    writeFileSync(path.join(dirA, 'google-cx'), 'google-cx');
    writeFileSync(path.join(dirA, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(path.join(dirA, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(dirA, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'not-for-repo' })
    );
    writeFileSync(
      path.join(dirA, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const secretRootB = mkdtempSync(path.join(os.tmpdir(), 'openfons-search-b-'));
    const dirB = path.join(secretRootB, 'project', 'openfons');
    mkdirSync(dirB, { recursive: true });
    writeFileSync(path.join(dirB, 'google-api-key'), 'google-key');
    writeFileSync(path.join(dirB, 'google-cx'), 'google-cx');
    writeFileSync(path.join(dirB, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(path.join(dirB, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(dirB, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'not-for-repo' })
    );
    writeFileSync(
      path.join(dirB, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const gatewayA = createRuntimeGateway({
      projectId: 'openfons',
      repoRoot: process.cwd(),
      secretRoot: secretRootA,
      runStore: store
    });
    const gatewayB = createRuntimeGateway({
      projectId: 'openfons',
      repoRoot: process.cwd(),
      secretRoot: secretRootB,
      runStore: store
    });

    const result = await gatewayA.search({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'openai pricing official',
      providers: ['ddg'],
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    const dispatch = await gatewayB.upgradeCandidates(result.searchRun.id, {
      selectedSearchResultIds: []
    });

    expect(dispatch.searchRunId).toBe(result.searchRun.id);
  });
});
```

- [ ] **Step 2: Extend the authenticated browser test to require configured browser runtime resolution**

```ts
// append to tests/integration/authenticated-local-browser.test.ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveConfiguredBrowserRuntime } from '../../services/control-api/src/collection/authenticated-local-browser/runtime.js';

it('resolves the configured browser runtime for the tiktok route', () => {
  const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-browser-runtime-'));
  const dir = path.join(secretRoot, 'project', 'openfons');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'google-api-key'), 'google-key');
  writeFileSync(path.join(dir, 'google-cx'), 'google-cx');
  writeFileSync(path.join(dir, 'pinchtab-token'), 'pinchtab-token');
  writeFileSync(path.join(dir, 'tiktok-cookie-main'), 'sessionid=abc');
  writeFileSync(
    path.join(dir, 'tiktok-account-main.json'),
    JSON.stringify({ username: 'collector-bot', password: 'not-for-repo' })
  );
  writeFileSync(
    path.join(dir, 'global-proxy-pool.json'),
    JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
  );

  const runtime = resolveConfiguredBrowserRuntime({
    projectId: 'openfons',
    routeKey: 'tiktok',
    repoRoot: process.cwd(),
    secretRoot
  });

  expect(runtime.pluginId).toBe('pinchtab-local');
  expect(runtime.driver).toBe('pinchtab');
  expect(runtime.secrets.tokenRef.configured).toBe(true);
});
```

- [ ] **Step 3: Run the focused batch 3 tests to verify they fail**

Run:
`pnpm exec vitest run tests/integration/search-gateway-runtime.test.ts tests/integration/authenticated-local-browser.test.ts`
Expected: FAIL because runtime setup still depends on env loaders and authenticated browser planning cannot resolve configured runtime bindings.

- [ ] **Step 4: Replace the env-only search-gateway runtime loader**

```ts
// services/search-gateway/src/config.ts
import type {
  ProviderStatus,
  SearchProviderId,
  UpgradeCandidate,
  ValidationResult
} from '@openfons/contracts';
import {
  loadConfigCenterState,
  resolveSearchRuntime,
  validateProjectConfig
} from '@openfons/config-center';
import {
  createDdgAdapter,
  createGoogleAdapter,
  createSearchGateway,
  type SearchRunStore as GatewayRunStore,
  type SearchProviderAdapter
} from '@openfons/search-gateway';

const createAdapterFromResolvedPlugin = ({
  plugin,
  fetchImpl,
  ddgSearchImpl
}: {
  plugin: ReturnType<typeof resolveSearchRuntime>['providers'][number];
  fetchImpl?: typeof fetch;
  ddgSearchImpl?: Parameters<typeof createDdgAdapter>[0]['searchImpl'];
}): [SearchProviderId, SearchProviderAdapter] => {
  switch (plugin.driver) {
    case 'google':
      return [
        'google',
        createGoogleAdapter({
          fetch: fetchImpl ?? fetch,
          apiKey: String(plugin.secrets.apiKeyRef.value),
          cx: String(plugin.secrets.cxRef.value)
        })
      ];
    case 'ddg':
      return [
        'ddg',
        createDdgAdapter({
          fetch: fetchImpl ?? fetch,
          endpoint: plugin.config.endpoint as string | undefined,
          searchImpl: ddgSearchImpl
        })
      ];
    default:
      throw new Error(`unsupported search driver ${plugin.driver}`);
  }
};
```

```ts
// continue in services/search-gateway/src/config.ts
export const createRuntimeGateway = ({
  projectId,
  repoRoot,
  secretRoot,
  fetchImpl = fetch,
  ddgSearchImpl,
  dispatchCollectorRequests,
  runStore
}: {
  projectId: string;
  repoRoot: string;
  secretRoot?: string;
  fetchImpl?: typeof fetch;
  ddgSearchImpl?: Parameters<typeof createDdgAdapter>[0]['searchImpl'];
  dispatchCollectorRequests?: (candidates: UpgradeCandidate[]) => Promise<void>;
  runStore?: GatewayRunStore;
}) => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const runtime = resolveSearchRuntime({ state, projectId });

  const providers = Object.fromEntries(
    runtime.providers.map((plugin) =>
      createAdapterFromResolvedPlugin({ plugin, fetchImpl, ddgSearchImpl })
    )
  ) as Partial<Record<SearchProviderId, SearchProviderAdapter>>;

  return createSearchGateway({
    projectId,
    providers,
    dispatchCollectorRequests,
    runStore
  });
};

export const loadProviderStatus = (
  projectId: string,
  repoRoot: string,
  secretRoot?: string
): ProviderStatus[] => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const runtime = resolveSearchRuntime({ state, projectId });
  const validation = validateProjectConfig({ state, projectId });

  return runtime.providers
    .map((plugin) => ({
      providerId: plugin.driver as SearchProviderId,
      enabled: true,
      healthy: validation.status !== 'invalid',
      credentialResolvedFrom: 'project',
      degraded: validation.status !== 'valid',
      reason:
        validation.status === 'invalid'
          ? validation.errors.map((item) => item.message).join('; ')
          : undefined
    }));
};

export const loadValidation = (
  projectId: string,
  repoRoot: string,
  secretRoot?: string
): ValidationResult => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const validation = validateProjectConfig({ state, projectId });

  return {
    valid: validation.status === 'valid',
    errors: validation.errors.map((item) => item.message),
    warnings: validation.warnings.map((item) => item.message),
    resolvedProviders: loadProviderStatus(projectId, repoRoot, secretRoot)
  };
};
```

```ts
// services/search-gateway/src/server.ts
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createMemoryStore } from './store.js';
import {
  createRuntimeGateway,
  loadProviderStatus,
  loadValidation
} from './config.js';

const store = createMemoryStore();
const repoRoot = process.cwd();
const secretRoot = process.env.OPENFONS_SECRET_ROOT;

const getGateway = (projectId: string) =>
  createRuntimeGateway({
    projectId,
    repoRoot,
    secretRoot,
    fetchImpl: fetch,
    runStore: store
  });

const app = createApp({
  search: (request) => getGateway(request.projectId).search(request),
  providerStatus: (projectId = 'openfons') =>
    loadProviderStatus(projectId, repoRoot, secretRoot),
  validate: (projectId = 'openfons') =>
    loadValidation(projectId, repoRoot, secretRoot),
  upgrade: (searchRunId, selection) =>
    getGateway(store.getRun(searchRunId)?.searchRun.projectId ?? 'openfons').upgradeCandidates(
      searchRunId,
      selection
    )
}, store);

serve(
  {
    fetch: app.fetch,
    port: 3003
  },
  () => {
    console.log('search-gateway listening on http://localhost:3003');
  }
);
```

- [ ] **Step 5: Remove duplicated env assembly from control-api search client**

```ts
// services/control-api/src/collection/search-client.ts
import {
  loadConfigCenterState,
  resolveSearchRuntime
} from '@openfons/config-center';
import {
  createDdgAdapter,
  createGoogleAdapter,
  createSearchGateway
} from '@openfons/search-gateway';

export const createRuntimeSearchClient = ({
  projectId = 'openfons',
  repoRoot = process.cwd(),
  secretRoot,
  fetchImpl = fetch,
  ddgSearchImpl
}: {
  projectId?: string;
  repoRoot?: string;
  secretRoot?: string;
  fetchImpl?: typeof fetch;
  ddgSearchImpl?: Parameters<typeof import('@openfons/search-gateway').createDdgAdapter>[0]['searchImpl'];
} = {}): SearchClient => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const runtime = resolveSearchRuntime({ state, projectId });
  const providers = Object.fromEntries(
    runtime.providers.map((plugin) => {
      switch (plugin.driver) {
        case 'google':
          return [
            'google',
            createGoogleAdapter({
              fetch: fetchImpl,
              apiKey: String(plugin.secrets.apiKeyRef.value),
              cx: String(plugin.secrets.cxRef.value)
            })
          ];
        case 'ddg':
          return [
            'ddg',
            createDdgAdapter({
              fetch: fetchImpl,
              endpoint: plugin.config.endpoint as string | undefined,
              searchImpl: ddgSearchImpl
            })
          ];
        default:
          throw new Error(`unsupported search driver ${plugin.driver}`);
      }
    })
  );

  const gateway = createSearchGateway({
    projectId,
    providers
  });

  return {
    search: (request) => gateway.search(request)
  };
};
```

- [ ] **Step 6: Add route-aware browser-runtime resolution**

```ts
// services/control-api/src/collection/authenticated-local-browser/runtime.ts
import {
  loadConfigCenterState,
  resolveBrowserRouteRuntime,
  resolveMaskedProjectRuntimeConfig
} from '@openfons/config-center';

export const resolveConfiguredBrowserRuntime = ({
  projectId,
  routeKey,
  repoRoot,
  secretRoot
}: {
  projectId: string;
  routeKey: string;
  repoRoot: string;
  secretRoot?: string;
}) => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  return resolveBrowserRouteRuntime({ state, projectId, routeKey });
};

export const describeConfiguredBrowserRuntime = ({
  projectId,
  routeKey,
  repoRoot,
  secretRoot
}: {
  projectId: string;
  routeKey: string;
  repoRoot: string;
  secretRoot?: string;
}) => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const runtime = resolveMaskedProjectRuntimeConfig({ state, projectId });
  return runtime.routes[routeKey]?.browser;
};
```

```ts
// services/control-api/src/collection/authenticated-local-browser/index.ts
import type { MaskedResolvedPluginRuntime } from '@openfons/contracts';

export type AuthenticatedLocalBrowserCaptureRequest = {
  state: AuthenticatedLocalBrowserState;
  reason: AuthenticatedLocalBrowserReason;
  title: string;
  url: string;
  siteProfile: SiteProfile;
  browserRuntime?: MaskedResolvedPluginRuntime;
  requiresAuthenticatedSession: boolean;
  requiresOperatorApproval: boolean;
  requiredArtifacts: LocalBrowserArtifactKind[];
  recommendedSteps: string[];
};
```

- [ ] **Step 7: Re-run the batch 3 tests**

Run:
`pnpm exec vitest run tests/integration/search-gateway-runtime.test.ts tests/integration/authenticated-local-browser.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add services/search-gateway/src/config.ts \
  services/search-gateway/src/server.ts \
  services/control-api/src/collection/search-client.ts \
  services/control-api/src/collection/authenticated-local-browser/runtime.ts \
  services/control-api/src/collection/authenticated-local-browser/index.ts \
  tests/integration/search-gateway-runtime.test.ts \
  tests/integration/authenticated-local-browser.test.ts
git commit -m "feat(config-center): wire search and browser runtimes"
```

### Task 4: Batch 4 - Integrate Crawler Adapters

**Files:**
- Create: `services/control-api/src/collection/crawler-adapters/types.ts`
- Create: `services/control-api/src/collection/crawler-adapters/registry.ts`
- Create: `services/control-api/src/collection/crawler-adapters/youtube-yt-dlp.ts`
- Create: `services/control-api/src/collection/crawler-adapters/twitter-twscrape.ts`
- Create: `services/control-api/src/collection/crawler-adapters/tiktok-api.ts`
- Create: `services/control-api/src/collection/crawler-adapters/reddit-praw.ts`
- Create: `services/control-api/src/collection/crawler-adapters/media-crawler-bridge.ts`
- Modify: `services/control-api/src/collection/real-collection-bridge.ts`
- Test: `tests/integration/crawler-adapter-config-center.test.ts`

- [ ] **Step 1: Write the failing crawler-adapter integration test**

```ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildConfiguredCrawlerAdapter,
  createConfiguredCrawlerRegistry
} from '../../services/control-api/src/collection/crawler-adapters/registry.js';

describe('crawler adapters from config center', () => {
  it('builds route-aware adapters for youtube and tiktok', () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-crawlers-'));
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(dir, 'google-cx'), 'google-cx');
    writeFileSync(path.join(dir, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(dir, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'secret' })
    );
    writeFileSync(path.join(dir, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(
      path.join(dir, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const registry = createConfiguredCrawlerRegistry({
      projectId: 'openfons',
      repoRoot: process.cwd(),
      secretRoot
    });

    const youtube = registry.get('youtube');
    const tiktok = registry.get('tiktok');

    expect(youtube?.driver).toBe('yt-dlp');
    expect(youtube?.requiresAuth).toBe(false);
    expect(tiktok?.driver).toBe('tiktok-api');
    expect(tiktok?.requiresAuth).toBe(true);
    expect(tiktok?.browserRuntime?.pluginId).toBe('pinchtab-local');
  });

  it('maps non-openfons drivers from resolved route runtime instead of hardcoded route ids', () => {
    expect(
      buildConfiguredCrawlerAdapter({
        routeKey: 'twitter',
        mode: 'requires-auth',
        collection: { pluginId: 'twitter-adapter', driver: 'twscrape', type: 'crawler-adapter', config: {}, secrets: {} },
        browser: undefined,
        accounts: [{ pluginId: 'twitter-account-main', driver: 'credentials-file', type: 'account-source', config: {}, secrets: {} }],
        cookies: [],
        proxy: { pluginId: 'global-proxy-pool', driver: 'static-proxy-file', type: 'proxy-source', config: {}, secrets: {} }
      }).driver
    ).toBe('twscrape');

    expect(
      buildConfiguredCrawlerAdapter({
        routeKey: 'reddit',
        mode: 'requires-auth',
        collection: { pluginId: 'reddit-adapter', driver: 'praw', type: 'crawler-adapter', config: {}, secrets: {} },
        browser: undefined,
        accounts: [{ pluginId: 'reddit-account-main', driver: 'credentials-file', type: 'account-source', config: {}, secrets: {} }],
        cookies: [],
        proxy: undefined
      }).driver
    ).toBe('praw');

    expect(
      buildConfiguredCrawlerAdapter({
        routeKey: 'xiaohongshu',
        mode: 'requires-auth',
        collection: { pluginId: 'media-crawler-adapter', driver: 'media-crawler', type: 'crawler-adapter', config: {}, secrets: {} },
        browser: { pluginId: 'pinchtab-local', driver: 'pinchtab', type: 'browser-runtime', config: {}, secrets: {} },
        accounts: [{ pluginId: 'xiaohongshu-account-main', driver: 'credentials-file', type: 'account-source', config: {}, secrets: {} }],
        cookies: [{ pluginId: 'xiaohongshu-cookie-main', driver: 'netscape-cookie-file', type: 'cookie-source', config: {}, secrets: {} }],
        proxy: { pluginId: 'global-proxy-pool', driver: 'static-proxy-file', type: 'proxy-source', config: {}, secrets: {} }
      }).enabled
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the crawler-adapter test to verify it fails**

Run: `pnpm exec vitest run tests/integration/crawler-adapter-config-center.test.ts`
Expected: FAIL because no crawler-adapter registry exists yet.

- [ ] **Step 3: Add shared crawler-adapter runtime shapes**

```ts
// services/control-api/src/collection/crawler-adapters/types.ts
export type ConfiguredCrawlerAdapter = {
  routeKey: string;
  pluginId: string;
  driver: 'yt-dlp' | 'twscrape' | 'tiktok-api' | 'praw' | 'media-crawler';
  enabled: boolean;
  requiresAuth: boolean;
  browserRuntime?: {
    pluginId: string;
    driver: string;
  };
  accounts: string[];
  cookies: string[];
  proxy?: string;
};
```

- [ ] **Step 4: Add driver-specific adapter factories**

```ts
// services/control-api/src/collection/crawler-adapters/youtube-yt-dlp.ts
import type { ResolvedCrawlerRouteRuntime } from '@openfons/config-center';
import type { ConfiguredCrawlerAdapter } from './types.js';

export const createYoutubeYtDlpAdapter = (
  route: ResolvedCrawlerRouteRuntime
): ConfiguredCrawlerAdapter => ({
  routeKey: route.routeKey,
  pluginId: route.collection.pluginId,
  driver: 'yt-dlp',
  enabled: true,
  requiresAuth: route.mode === 'requires-auth',
  accounts: route.accounts.map((item) => item.pluginId),
  cookies: route.cookies.map((item) => item.pluginId),
  proxy: route.proxy?.pluginId
});
```

```ts
// services/control-api/src/collection/crawler-adapters/tiktok-api.ts
import type { ResolvedCrawlerRouteRuntime } from '@openfons/config-center';
import type { ConfiguredCrawlerAdapter } from './types.js';

export const createTikTokApiAdapter = (
  route: ResolvedCrawlerRouteRuntime
): ConfiguredCrawlerAdapter => ({
  routeKey: route.routeKey,
  pluginId: route.collection.pluginId,
  driver: 'tiktok-api',
  enabled: true,
  requiresAuth: route.mode === 'requires-auth',
  browserRuntime: route.browser
    ? {
        pluginId: route.browser.pluginId,
        driver: route.browser.driver
      }
    : undefined,
  accounts: route.accounts.map((item) => item.pluginId),
  cookies: route.cookies.map((item) => item.pluginId),
  proxy: route.proxy?.pluginId
});
```

```ts
// services/control-api/src/collection/crawler-adapters/twitter-twscrape.ts
import type { ResolvedCrawlerRouteRuntime } from '@openfons/config-center';
import type { ConfiguredCrawlerAdapter } from './types.js';

export const createTwitterTwscrapeAdapter = (
  route: ResolvedCrawlerRouteRuntime
): ConfiguredCrawlerAdapter => ({
  routeKey: route.routeKey,
  pluginId: route.collection.pluginId,
  driver: 'twscrape',
  enabled: true,
  requiresAuth: route.mode === 'requires-auth',
  accounts: route.accounts.map((item) => item.pluginId),
  cookies: route.cookies.map((item) => item.pluginId),
  proxy: route.proxy?.pluginId
});
```

```ts
// services/control-api/src/collection/crawler-adapters/reddit-praw.ts
import type { ResolvedCrawlerRouteRuntime } from '@openfons/config-center';
import type { ConfiguredCrawlerAdapter } from './types.js';

export const createRedditPrawAdapter = (
  route: ResolvedCrawlerRouteRuntime
): ConfiguredCrawlerAdapter => ({
  routeKey: route.routeKey,
  pluginId: route.collection.pluginId,
  driver: 'praw',
  enabled: true,
  requiresAuth: route.mode === 'requires-auth',
  accounts: route.accounts.map((item) => item.pluginId),
  cookies: route.cookies.map((item) => item.pluginId),
  proxy: route.proxy?.pluginId
});
```

```ts
// services/control-api/src/collection/crawler-adapters/media-crawler-bridge.ts
import type { ResolvedCrawlerRouteRuntime } from '@openfons/config-center';
import type { ConfiguredCrawlerAdapter } from './types.js';

export const createMediaCrawlerBridgeAdapter = (
  route: ResolvedCrawlerRouteRuntime
): ConfiguredCrawlerAdapter => ({
  routeKey: route.routeKey,
  pluginId: route.collection.pluginId,
  driver: 'media-crawler',
  enabled: false,
  requiresAuth: route.mode === 'requires-auth',
  browserRuntime: route.browser
    ? {
        pluginId: route.browser.pluginId,
        driver: route.browser.driver
      }
    : undefined,
  accounts: route.accounts.map((item) => item.pluginId),
  cookies: route.cookies.map((item) => item.pluginId),
  proxy: route.proxy?.pluginId
});
```

- [ ] **Step 5: Build the registry from resolved config-center bindings**

```ts
// services/control-api/src/collection/crawler-adapters/registry.ts
import {
  loadConfigCenterState,
  loadProjectBinding,
  resolveCrawlerRouteRuntime
} from '@openfons/config-center';
import { createMediaCrawlerBridgeAdapter } from './media-crawler-bridge.js';
import { createRedditPrawAdapter } from './reddit-praw.js';
import { createTikTokApiAdapter } from './tiktok-api.js';
import { createTwitterTwscrapeAdapter } from './twitter-twscrape.js';
import type { ConfiguredCrawlerAdapter } from './types.js';
import { createYoutubeYtDlpAdapter } from './youtube-yt-dlp.js';

export const buildConfiguredCrawlerAdapter = (
  route: ReturnType<typeof resolveCrawlerRouteRuntime>
): ConfiguredCrawlerAdapter => {
  switch (route.collection.driver) {
    case 'yt-dlp':
      return createYoutubeYtDlpAdapter(route);
    case 'tiktok-api':
      return createTikTokApiAdapter(route);
    case 'twscrape':
      return createTwitterTwscrapeAdapter(route);
    case 'praw':
      return createRedditPrawAdapter(route);
    case 'media-crawler':
      return createMediaCrawlerBridgeAdapter(route);
    default:
      throw new Error(`unsupported crawler driver ${route.collection.driver}`);
  }
};

export const createConfiguredCrawlerRegistry = ({
  projectId,
  repoRoot,
  secretRoot
}: {
  projectId: string;
  repoRoot: string;
  secretRoot?: string;
}) => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const binding = loadProjectBinding({ repoRoot, projectId });
  const routeKeys = Object.keys(binding.routes).filter(
    (routeKey) => Boolean(binding.routes[routeKey]?.collection)
  );
  const adapters = new Map<string, ConfiguredCrawlerAdapter>(
    routeKeys
      .map((routeKey) => {
        const route = resolveCrawlerRouteRuntime({ state, projectId, routeKey });
        return [routeKey, buildConfiguredCrawlerAdapter(route)] as const;
      })
  );

  return {
    get: (routeKey: string) => adapters.get(routeKey),
    list: () => [...adapters.values()]
  };
};
```

- [ ] **Step 6: Bridge real collection through the crawler registry**

```ts
// services/control-api/src/collection/real-collection-bridge.ts
import { createConfiguredCrawlerRegistry } from './crawler-adapters/registry.js';

export const createAiProcurementRealCollectionBridge = ({
  projectId = 'openfons',
  repoRoot = process.cwd(),
  secretRoot,
  searchClient = createRuntimeSearchClient({ projectId, repoRoot, secretRoot }),
  captureRunner = createCaptureRunner()
}: {
  projectId?: string;
  repoRoot?: string;
  secretRoot?: string;
  searchClient?: SearchClient;
  captureRunner?: CaptureRunner;
} = {}) => {
  const crawlerRegistry = createConfiguredCrawlerRegistry({
    projectId,
    repoRoot,
    secretRoot
  });

  // Keep the current AI procurement capture path unchanged for public pages.
  // Use crawlerRegistry only when a resolved route later demands authenticated
  // or adapter-backed collection.
```

- [ ] **Step 7: Re-run the crawler-adapter integration test**

Run: `pnpm exec vitest run tests/integration/crawler-adapter-config-center.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add services/control-api/src/collection/crawler-adapters \
  services/control-api/src/collection/real-collection-bridge.ts \
  tests/integration/crawler-adapter-config-center.test.ts
git commit -m "feat(config-center): wire crawler adapters"
```

## Self-Review

### Spec coverage

Covered:

1. Platform-native plugin types and instances: Task 1.
2. `SecretRef` plus repo-visible vs local-private split: Task 1.
3. Internal raw runtime output vs masked management output are separated explicitly in contracts, resolver, and API flow: Tasks 1 and 2.
4. Validation is now scoped to project closure instead of every plugin file in the repo: Task 1.
5. `control-api` as the single masked management surface: Task 2.
6. `search-gateway` and authenticated browser runtime integration without cross-service `src` imports: Task 3.
7. Crawler adapter integration order for `yt-dlp / twscrape / TikTokApi / PRAW / MediaCrawler` with route-driven registry wiring: Task 4.
8. Required four-batch delivery order: Tasks 1 through 4.

Design refinement intentionally added:

1. Pure config-center loader/validator/resolver logic lives in `packages/config-center` instead of `services/control-api/src/config-center` only.
2. `control-api` remains the only HTTP entry point, but downstream services reuse the same shared core without cross-service imports.

### Placeholder scan

No `TODO`, `TBD`, or “implement later” placeholders remain. Each task includes concrete file paths, test files, commands, and code skeletons.

### Type consistency

The plan consistently uses these names:

1. `PluginType`
2. `PluginSpec`
3. `PluginInstance`
4. `SecretRef`
5. `ProjectBinding`
6. `ConfigValidationResult`
7. `ResolvedRuntimeConfig`
8. `MaskedResolvedRuntimeConfig`
9. `ResolvedCrawlerRouteRuntime`

The route/runtime examples consistently use:

1. `google-default`
2. `ddg-default`
3. `local-browser-default`
4. `pinchtab-local`
5. `youtube-adapter`
6. `tiktok-adapter`
7. `tiktok-account-main`
8. `tiktok-cookie-main`
9. `global-proxy-pool`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-07-platform-plugin-config-center.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
