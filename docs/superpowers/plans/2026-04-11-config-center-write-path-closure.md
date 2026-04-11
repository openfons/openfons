# Config Center Write-Path Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the platform plugin config center by adding safe repo-backed mutation APIs for `PluginInstance` and `ProjectBinding`, with validation-before-write, optimistic concurrency, atomic persistence, and rollback-safe backups.

**Architecture:** Keep the read path in `packages/config-center` and extend it with a write sublayer instead of adding ad hoc file writes inside `control-api`. All writes stay repo-visible under `config/plugins/**` and `config/projects/**`; secrets remain out of repo under `~/.openfons/secrets/**`. `control-api` remains the only HTTP mutation surface, but it must call shared write helpers that support `dryRun`, lock acquisition, revision checks, and post-write validation before returning a result.

**Tech Stack:** TypeScript, pnpm workspaces, Zod, Hono, Vitest, JSON config files, Node `fs/path/crypto`, repo-local backup artifacts under `artifacts/config-center-backups/**`.

---

## External Reference Takeaways

These are the concrete ideas extracted from the local source review of `Agent-Reach` and `AiToEarn`, translated into `openfons` actions rather than copied literally.

1. From `Agent-Reach`: every operator-facing write should have a `dryRun` path that explains what will happen before changing files.
2. From `Agent-Reach`: keep platform self-checks close to the capability boundary. In `openfons`, write validation belongs in `packages/config-center`, not scattered through services.
3. From `Agent-Reach`: test the contract of each registry entry. In `openfons`, add contract tests for mutation request and result schemas, not just runtime schemas.
4. From `Agent-Reach`: prefer actionable failure messages over raw stack traces. Revision conflicts, lock timeouts, and validation failures must return structured JSON responses from `control-api`.
5. From `AiToEarn`: keep domain resources explicit. `PluginInstance` and `ProjectBinding` should get their own write helpers and API methods rather than one generic "write any file" endpoint.
6. From `AiToEarn`: keep orchestration out of storage code. File locking, atomic writes, and backups belong in a persistence helper layer below service logic.
7. From `AiToEarn`: mutation APIs need optimistic concurrency. Read endpoints must expose a revision token that clients can send back on write.
8. From `AiToEarn`: task/runtime orchestration should stay separate from config storage. `search-gateway`, browser runtime, and crawler runtime continue consuming resolved config only.
9. From both projects: operator workflow matters. Add a minimal runbook for previewing, applying, and recovering config writes.
10. From both projects: do not widen scope into UI, external vaults, or runtime secret value editing in this batch.

## Non-Goals

- Do not add a config-center UI in this batch.
- Do not add secret value write APIs; only `SecretRef` metadata may be written.
- Do not add delete endpoints or a generic "write any file" API in this batch.
- Do not add external vaults, databases, or dynamic plugin category registration.
- Do not change runtime consumers in `search-gateway` or crawler adapters beyond any read-shape adjustments needed for revision metadata.

## File Map

### Existing files to modify

- `packages/contracts/src/config-center.ts`
  Add optional persisted `meta` fields to `PluginInstance` and `ProjectBinding`.
- `packages/contracts/src/index.ts`
  Export the new write-path contracts.
- `packages/config-center/src/index.ts`
  Export persistence and mutation helpers.
- `packages/config-center/src/loader.ts`
  Add record-aware loaders that preserve file paths and revisions instead of returning parsed objects only.
- `services/control-api/src/config-center/service.ts`
  Expose read endpoints with revision metadata and add mutation methods.
- `services/control-api/src/config-center/router.ts`
  Add revision-bearing read responses, `PUT` mutation routes, and structured error mapping for write failures.
- `tests/integration/control-api-config-center.test.ts`
  Update read-route assertions to include revision metadata.

### New shared package files

- `packages/contracts/src/config-center-write.ts`
  Request and response schemas for config writes, revision metadata, and dry-run results.
- `packages/config-center/src/persistence/revision.ts`
  Deterministic content-hash revision helpers.
- `packages/config-center/src/persistence/lockfile.ts`
  Repo-local lock acquisition and release helpers.
- `packages/config-center/src/persistence/atomic-json.ts`
  Temp-file write plus rename helper for JSON persistence.
- `packages/config-center/src/persistence/backup.ts`
  Snapshot helper that writes previous content to `artifacts/config-center-backups/**`.
- `packages/config-center/src/mutations/plugin-instance-writes.ts`
  Plan and apply plugin-instance upsert writes.
- `packages/config-center/src/mutations/project-binding-writes.ts`
  Plan and apply locked project-binding writes.

### New tests

- `tests/contract/config-center-write-schema.test.ts`
  Contract coverage for revision, write request, and write result schemas.
- `tests/integration/config-center-record-loader.test.ts`
  Record-aware loader coverage for file path and revision discovery.
- `tests/integration/config-center-write.test.ts`
  Mutation coverage for `dryRun`, `apply`, revision mismatch, lock handling, backups, and validation.
- `tests/integration/control-api-config-center-write.test.ts`
  HTTP mutation surface coverage for plugin and project binding writes.

### New docs

- `docs/workbench/config-center-write-path-runbook.md`
  Operator-facing preview/apply/recover commands for the new write surface.

### Task 1: Add Write-Path Contracts And Record-Aware Loaders

**Files:**
- Create: `packages/contracts/src/config-center-write.ts`
- Modify: `packages/contracts/src/config-center.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/config-center/src/loader.ts`
- Create: `packages/config-center/src/persistence/revision.ts`
- Test: `tests/contract/config-center-write-schema.test.ts`
- Test: `tests/integration/config-center-record-loader.test.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
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
    expect(bindingRequest.binding.meta?.updatedAt).toBe('2026-04-11T16:00:00.000Z');
    expect(result.resource).toBe('plugin-instance');
  });
});
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run: `pnpm exec vitest run tests/contract/config-center-write-schema.test.ts`

Expected: FAIL with missing exports such as `RepoConfigRevisionSchema`, `PluginWriteRequestSchema`, or `ConfigWriteResultSchema`, and `PluginInstanceSchema` rejecting `meta`.

- [ ] **Step 3: Add the write-path contract module and optional metadata**

```ts
// packages/contracts/src/config-center-write.ts
import { z } from 'zod';
import {
  ConfigValidationResultSchema,
  PluginInstanceSchema,
  ProjectBindingSchema
} from './config-center.js';

export const RepoConfigRevisionSchema = z.object({
  etag: z.string().min(1),
  updatedAt: z.string().datetime()
});

export const PluginWriteRequestSchema = z.object({
  expectedRevision: z.string().min(1).optional(),
  dryRun: z.boolean().default(false),
  plugin: PluginInstanceSchema
});

export const ProjectBindingWriteRequestSchema = z.object({
  expectedRevision: z.string().min(1).optional(),
  dryRun: z.boolean().default(false),
  binding: ProjectBindingSchema
});

export const ConfigWriteResultSchema = z.object({
  status: z.enum(['applied', 'dry-run']),
  resource: z.enum(['plugin-instance', 'project-binding']),
  resourceId: z.string().min(1),
  changed: z.boolean(),
  revision: RepoConfigRevisionSchema,
  previousRevision: RepoConfigRevisionSchema.optional(),
  validation: ConfigValidationResultSchema,
  backupFile: z.string().min(1).optional(),
  lockWaitMs: z.number().int().nonnegative()
});
```

```ts
// packages/contracts/src/config-center.ts
const ConfigRecordMetaSchema = z.object({
  updatedAt: z.string().datetime(),
  updatedBy: z.string().min(1).optional()
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
  meta: ConfigRecordMetaSchema.optional(),
  healthCheck: z.object({
    kind: z.string().min(1),
    timeoutMs: z.number().int().positive().optional()
  }).optional()
});

export const ProjectBindingSchema = z.object({
  projectId: z.string().min(1),
  enabledPlugins: z.array(z.string().min(1)),
  roles: z.record(z.string(), z.union([z.string().min(1), z.array(z.string().min(1))])),
  routes: z.record(z.string(), ProjectRouteBindingSchema),
  overrides: z.record(z.string(), z.unknown()).default({}),
  meta: ConfigRecordMetaSchema.optional()
});
```

```ts
// packages/contracts/src/index.ts
export * from './config-center.js';
export * from './config-center-write.js';
```

- [ ] **Step 4: Write the failing record-loader test**

```ts
import { describe, expect, it } from 'vitest';
import {
  listPluginInstanceRecords,
  loadProjectBindingRecord
} from '@openfons/config-center';

describe('config-center record loaders', () => {
  it('returns file paths and revisions for plugin and project records', () => {
    const plugins = listPluginInstanceRecords({ repoRoot: process.cwd() });
    const google = plugins.find((item) => item.plugin.id === 'google-default');
    const binding = loadProjectBindingRecord({
      repoRoot: process.cwd(),
      projectId: 'openfons'
    });

    expect(google?.filePath.endsWith('google-default.json')).toBe(true);
    expect(google?.revision.etag.startsWith('sha256:')).toBe(true);
    expect(binding.filePath.endsWith('bindings.json')).toBe(true);
    expect(binding.revision.etag.startsWith('sha256:')).toBe(true);
  });
});
```

- [ ] **Step 5: Run the loader test to verify it fails**

Run: `pnpm exec vitest run tests/integration/config-center-record-loader.test.ts`

Expected: FAIL because `listPluginInstanceRecords` and `loadProjectBindingRecord` do not exist yet.

- [ ] **Step 6: Implement deterministic revision hashing and record-aware loaders**

```ts
// packages/config-center/src/persistence/revision.ts
import { createHash } from 'node:crypto';
import type { RepoConfigRevision } from '@openfons/contracts';

export const buildRepoConfigRevision = ({
  rawContent,
  updatedAt
}: {
  rawContent: string;
  updatedAt: string;
}): RepoConfigRevision => ({
  etag: `sha256:${createHash('sha256').update(rawContent).digest('hex')}`,
  updatedAt
});
```

```ts
// packages/config-center/src/loader.ts
export type PluginInstanceRecord = {
  filePath: string;
  plugin: PluginInstance;
  revision: RepoConfigRevision;
  rawContent: string;
};

export const listPluginInstanceRecords = ({
  repoRoot
}: {
  repoRoot: string;
}): PluginInstanceRecord[] => {
  const { instancesDir } = createConfigCenterPaths({ repoRoot });

  return fs
    .readdirSync(instancesDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const filePath = path.join(instancesDir, name);
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const plugin = PluginInstanceSchema.parse(JSON.parse(rawContent));
      return {
        filePath,
        rawContent,
        plugin,
        revision: buildRepoConfigRevision({
          rawContent,
          updatedAt: plugin.meta?.updatedAt ?? fs.statSync(filePath).mtime.toISOString()
        })
      };
    })
    .sort((left, right) => left.plugin.id.localeCompare(right.plugin.id));
};

export const loadProjectBindingRecord = ({
  repoRoot,
  projectId
}: {
  repoRoot: string;
  projectId: string;
}) => {
  const filePath = path.join(repoRoot, 'config', 'projects', projectId, 'plugins', 'bindings.json');
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const binding = ProjectBindingSchema.parse(JSON.parse(rawContent));

  return {
    filePath,
    rawContent,
    binding,
    revision: buildRepoConfigRevision({
      rawContent,
      updatedAt: binding.meta?.updatedAt ?? fs.statSync(filePath).mtime.toISOString()
    })
  };
};
```

- [ ] **Step 7: Re-run the contract and loader tests**

Run:

`pnpm exec vitest run tests/contract/config-center-write-schema.test.ts tests/integration/config-center-record-loader.test.ts`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add packages/contracts/src/config-center.ts \
  packages/contracts/src/config-center-write.ts \
  packages/contracts/src/index.ts \
  packages/config-center/src/loader.ts \
  packages/config-center/src/persistence/revision.ts \
  tests/contract/config-center-write-schema.test.ts \
  tests/integration/config-center-record-loader.test.ts
git commit -m "feat(config-center): add write contracts and record loaders"
```

### Task 2: Add Atomic Persistence, Backups, And Validation-Before-Write

**Files:**
- Create: `packages/config-center/src/persistence/lockfile.ts`
- Create: `packages/config-center/src/persistence/atomic-json.ts`
- Create: `packages/config-center/src/persistence/backup.ts`
- Create: `packages/config-center/src/mutations/plugin-instance-writes.ts`
- Create: `packages/config-center/src/mutations/project-binding-writes.ts`
- Modify: `packages/config-center/src/index.ts`
- Test: `tests/integration/config-center-write.test.ts`

- [ ] **Step 1: Write the failing write-path integration test**

```ts
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyPluginInstanceWrite,
  applyProjectBindingWrite,
  listPluginInstanceRecords
} from '@openfons/config-center';

const cloneRepoFixture = () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-config-write-'));
  const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-config-secrets-'));
  cpSync(path.join(process.cwd(), 'config'), path.join(repoRoot, 'config'), { recursive: true });
  mkdirSync(path.join(repoRoot, 'artifacts'), { recursive: true });
  const projectSecretDir = path.join(secretRoot, 'project', 'openfons');
  mkdirSync(projectSecretDir, { recursive: true });
  writeFileSync(path.join(projectSecretDir, 'google-api-key'), 'google-key');
  writeFileSync(path.join(projectSecretDir, 'google-cx'), 'google-cx');
  writeFileSync(path.join(projectSecretDir, 'pinchtab-token'), 'pinchtab-token');
  writeFileSync(path.join(projectSecretDir, 'tiktok-cookie-main'), 'sessionid=abc');
  writeFileSync(
    path.join(projectSecretDir, 'tiktok-account-main.json'),
    JSON.stringify({ username: 'collector-bot', password: 'secret' })
  );
  writeFileSync(
    path.join(projectSecretDir, 'global-proxy-pool.json'),
    JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
  );
  return { repoRoot, secretRoot };
};

describe('config-center writes', () => {
  it('supports dry-run, apply, optimistic concurrency, and lock failures for plugin instances', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const current = listPluginInstanceRecords({ repoRoot }).find(
      (item) => item.plugin.id === 'google-default'
    )!;

    const dryRun = await applyPluginInstanceWrite({
      repoRoot,
      secretRoot,
      projectId: 'openfons',
      plugin: {
        ...current.plugin,
        config: {
          ...current.plugin.config,
          endpoint: 'https://example.com/custom'
        }
      },
      expectedRevision: current.revision.etag,
      dryRun: true
    });

    expect(dryRun.status).toBe('dry-run');
    expect(readFileSync(current.filePath, 'utf8')).toContain('customsearch.googleapis.com');

    const applied = await applyPluginInstanceWrite({
      repoRoot,
      secretRoot,
      projectId: 'openfons',
      plugin: {
        ...current.plugin,
        config: {
          ...current.plugin.config,
          endpoint: 'https://example.com/custom'
        }
      },
      expectedRevision: current.revision.etag,
      dryRun: false
    });

    expect(applied.status).toBe('applied');
    expect(applied.backupFile).toContain('artifacts/config-center-backups');

    await expect(
      applyPluginInstanceWrite({
        repoRoot,
        secretRoot,
        projectId: 'openfons',
        plugin: current.plugin,
        expectedRevision: current.revision.etag,
        dryRun: false
      })
    ).rejects.toThrow(/revision conflict/i);

    mkdirSync(path.join(repoRoot, '.locks'), { recursive: true });
    writeFileSync(path.join(repoRoot, '.locks', 'plugin-google-default.lock'), '');

    await expect(
      applyPluginInstanceWrite({
        repoRoot,
        secretRoot,
        projectId: 'openfons',
        plugin: current.plugin,
        dryRun: false
      })
    ).rejects.toThrow(/lock unavailable/i);
  });

  it('blocks project-binding writes that make the project invalid', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();

    await expect(
      applyProjectBindingWrite({
        repoRoot,
        secretRoot,
        projectId: 'openfons',
        binding: {
          projectId: 'openfons',
          enabledPlugins: ['google-default'],
          roles: { primarySearch: 'missing-plugin' },
          routes: {},
          overrides: {}
        },
        dryRun: false
      })
    ).rejects.toThrow(/invalid/i);
  });
});
```

- [ ] **Step 2: Run the failing write test**

Run: `pnpm exec vitest run tests/integration/config-center-write.test.ts`

Expected: FAIL because the mutation helpers and persistence helpers do not exist yet.

- [ ] **Step 3: Add lock, atomic-write, and backup helpers**

```ts
// packages/config-center/src/persistence/lockfile.ts
import fs from 'node:fs';
import path from 'node:path';

export const withRepoConfigLock = async <T>({
  repoRoot,
  resourceKey,
  fn
}: {
  repoRoot: string;
  resourceKey: string;
  fn: (lockWaitMs: number) => Promise<T>;
}): Promise<T> => {
  const startedAt = Date.now();
  const lockDir = path.join(repoRoot, '.locks');
  const lockPath = path.join(lockDir, `${resourceKey}.lock`);
  fs.mkdirSync(lockDir, { recursive: true });

  try {
    const fd = fs.openSync(lockPath, 'wx');
    fs.closeSync(fd);
  } catch {
    throw new Error(`lock unavailable for ${resourceKey}`);
  }

  try {
    return await fn(Date.now() - startedAt);
  } finally {
    fs.rmSync(lockPath, { force: true });
  }
};
```

```ts
// packages/config-center/src/persistence/atomic-json.ts
import fs from 'node:fs';
import path from 'node:path';

export const writeJsonAtomically = ({
  targetPath,
  value
}: {
  targetPath: string;
  value: unknown;
}) => {
  const tempPath = `${targetPath}.tmp`;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, targetPath);
};
```

```ts
// packages/config-center/src/persistence/backup.ts
import fs from 'node:fs';
import path from 'node:path';

export const writeConfigBackup = ({
  repoRoot,
  resourceKey,
  rawContent
}: {
  repoRoot: string;
  resourceKey: string;
  rawContent: string;
}) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(repoRoot, 'artifacts', 'config-center-backups', `${stamp}-${resourceKey}.json`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rawContent, 'utf8');
  return filePath;
};
```

- [ ] **Step 4: Implement plugin-instance and project-binding mutation helpers**

```ts
// packages/config-center/src/mutations/plugin-instance-writes.ts
export const applyPluginInstanceWrite = async ({
  repoRoot,
  secretRoot,
  projectId,
  plugin,
  expectedRevision,
  dryRun
}: {
  repoRoot: string;
  secretRoot?: string;
  projectId: string;
  plugin: PluginInstance;
  expectedRevision?: string;
  dryRun: boolean;
}) =>
  withRepoConfigLock({
    repoRoot,
    resourceKey: `plugin-${plugin.id}`,
    fn: async (lockWaitMs) => {
      const current = listPluginInstanceRecords({ repoRoot }).find((item) => item.plugin.id === plugin.id);
      if (expectedRevision && current && current.revision.etag !== expectedRevision) {
        throw new Error(`revision conflict for plugin ${plugin.id}`);
      }

      const nextUpdatedAt = new Date().toISOString();
      const nextPlugin = {
        ...plugin,
        meta: {
          ...plugin.meta,
          updatedAt: nextUpdatedAt,
          updatedBy: 'control-api'
        }
      };

      const nextState = loadConfigCenterState({ repoRoot, secretRoot });
      const nextPlugins = nextState.pluginInstances
        .filter((item) => item.id !== plugin.id)
        .concat(nextPlugin);
      const binding = loadProjectBinding({ repoRoot, projectId });
      const validation = validatePluginSelection({
        state: { ...nextState, pluginInstances: nextPlugins },
        pluginIds: [...new Set([...collectProjectClosure(binding), plugin.id])]
      });

      if (validation.status === 'invalid') {
        throw new Error(`invalid plugin write for ${plugin.id}`);
      }

      if (dryRun) {
        return {
          status: 'dry-run',
          resource: 'plugin-instance',
          resourceId: plugin.id,
          changed: JSON.stringify(current?.plugin ?? null) !== JSON.stringify(nextPlugin),
          revision: buildRepoConfigRevision({
            rawContent: `${JSON.stringify(nextPlugin, null, 2)}\n`,
            updatedAt: nextUpdatedAt
          }),
          previousRevision: current?.revision,
          validation,
          lockWaitMs
        };
      }

      const targetPath = current?.filePath ?? path.join(repoRoot, 'config', 'plugins', 'instances', `${plugin.id}.json`);
      const backupFile = current
        ? writeConfigBackup({
            repoRoot,
            resourceKey: `plugin-${plugin.id}`,
            rawContent: current.rawContent
          })
        : undefined;
      writeJsonAtomically({ targetPath, value: nextPlugin });
      const persistedContent = readFileSync(targetPath, 'utf8');

      return {
        status: 'applied',
        resource: 'plugin-instance',
        resourceId: plugin.id,
        changed: true,
        revision: buildRepoConfigRevision({
          rawContent: persistedContent,
          updatedAt: nextUpdatedAt
        }),
        previousRevision: current?.revision,
        validation,
        backupFile,
        lockWaitMs
      };
    }
  });
```

```ts
// packages/config-center/src/mutations/project-binding-writes.ts
export const applyProjectBindingWrite = async ({
  repoRoot,
  secretRoot,
  projectId,
  binding,
  expectedRevision,
  dryRun
}: {
  repoRoot: string;
  secretRoot?: string;
  projectId: string;
  binding: ProjectBinding;
  expectedRevision?: string;
  dryRun: boolean;
}) =>
  withRepoConfigLock({
    repoRoot,
    resourceKey: `project-${projectId}-bindings`,
    fn: async (lockWaitMs) => {
      const current = loadProjectBindingRecord({ repoRoot, projectId });
      if (expectedRevision && current.revision.etag !== expectedRevision) {
        throw new Error(`revision conflict for project ${projectId}`);
      }

      const nextUpdatedAt = new Date().toISOString();
      const nextBinding = {
        ...binding,
        projectId,
        meta: {
          ...binding.meta,
          updatedAt: nextUpdatedAt,
          updatedBy: 'control-api'
        }
      };

      const state = loadConfigCenterState({ repoRoot, secretRoot });
      const validation = validatePluginSelection({
        state,
        pluginIds: collectProjectClosure(nextBinding)
      });

      if (validation.status === 'invalid') {
        throw new Error(`invalid project binding write for ${projectId}`);
      }

      if (dryRun) {
        return {
          status: 'dry-run',
          resource: 'project-binding',
          resourceId: projectId,
          changed: JSON.stringify(current.binding) !== JSON.stringify(nextBinding),
          revision: buildRepoConfigRevision({
            rawContent: `${JSON.stringify(nextBinding, null, 2)}\n`,
            updatedAt: nextUpdatedAt
          }),
          previousRevision: current.revision,
          validation,
          lockWaitMs
        };
      }

      const backupFile = writeConfigBackup({
        repoRoot,
        resourceKey: `project-${projectId}-bindings`,
        rawContent: current.rawContent
      });
      writeJsonAtomically({ targetPath: current.filePath, value: nextBinding });
      const persistedContent = readFileSync(current.filePath, 'utf8');

      return {
        status: 'applied',
        resource: 'project-binding',
        resourceId: projectId,
        changed: true,
        revision: buildRepoConfigRevision({
          rawContent: persistedContent,
          updatedAt: nextUpdatedAt
        }),
        previousRevision: current.revision,
        validation,
        backupFile,
        lockWaitMs
      };
    }
  });
```

- [ ] **Step 5: Export the mutation surface**

```ts
// packages/config-center/src/index.ts
export * from './config-paths.js';
export * from './loader.js';
export * from './masking.js';
export * from './mutations/plugin-instance-writes.js';
export * from './mutations/project-binding-writes.js';
export * from './persistence/atomic-json.js';
export * from './persistence/backup.js';
export * from './persistence/lockfile.js';
export * from './persistence/revision.js';
export * from './resolver.js';
export * from './runtime/browser.js';
export * from './runtime/crawler.js';
export * from './runtime/search.js';
export * from './secret-store.js';
export * from './spec-registry.js';
export * from './validator.js';
```

- [ ] **Step 6: Re-run the write-path tests**

Run:

`pnpm exec vitest run tests/integration/config-center-write.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/config-center/src/index.ts \
  packages/config-center/src/persistence \
  packages/config-center/src/mutations \
  tests/integration/config-center-write.test.ts
git commit -m "feat(config-center): add atomic config writes"
```

### Task 3: Expose The Write Surface Through Control API

**Files:**
- Modify: `services/control-api/src/config-center/service.ts`
- Modify: `services/control-api/src/config-center/router.ts`
- Modify: `tests/integration/control-api-config-center.test.ts`
- Create: `tests/integration/control-api-config-center-write.test.ts`

- [ ] **Step 1: Write the failing HTTP mutation test**

```ts
import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app.js';

const cloneRepoFixture = () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-control-write-'));
  const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-control-secrets-'));
  cpSync(path.join(process.cwd(), 'config'), path.join(repoRoot, 'config'), { recursive: true });
  const projectSecretDir = path.join(secretRoot, 'project', 'openfons');
  mkdirSync(projectSecretDir, { recursive: true });
  writeFileSync(path.join(projectSecretDir, 'google-api-key'), 'google-key');
  writeFileSync(path.join(projectSecretDir, 'google-cx'), 'google-cx');
  writeFileSync(path.join(projectSecretDir, 'pinchtab-token'), 'pinchtab-token');
  writeFileSync(path.join(projectSecretDir, 'tiktok-cookie-main'), 'sessionid=abc');
  writeFileSync(
    path.join(projectSecretDir, 'tiktok-account-main.json'),
    JSON.stringify({ username: 'collector-bot', password: 'secret' })
  );
  writeFileSync(
    path.join(projectSecretDir, 'global-proxy-pool.json'),
    JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
  );
  return { repoRoot, secretRoot };
};

describe('control-api config center write routes', () => {
  it('returns revisions on reads and supports dry-run and apply writes', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const app = createApp({ configCenter: { repoRoot, secretRoot } });

    const pluginDetail = await app.request('/api/v1/config/plugins/google-default');
    const pluginBody = await pluginDetail.json();
    expect(pluginBody.revision.etag.startsWith('sha256:')).toBe(true);

    const dryRun = await app.request('/api/v1/config/plugins/google-default?dryRun=true', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: pluginBody.revision.etag,
        plugin: {
          ...pluginBody.plugin,
          config: {
            ...pluginBody.plugin.config,
            endpoint: 'https://example.com/custom'
          }
        }
      })
    });

    expect(dryRun.status).toBe(200);
    expect((await dryRun.json()).status).toBe('dry-run');

    const conflict = await app.request('/api/v1/config/plugins/google-default', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: 'sha256:stale',
        plugin: pluginBody.plugin
      })
    });

    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({
      error: 'revision-conflict'
    });
  });
});
```

- [ ] **Step 2: Run the HTTP mutation test to verify it fails**

Run: `pnpm exec vitest run tests/integration/control-api-config-center-write.test.ts`

Expected: FAIL because read routes do not return revisions and write routes do not exist.

- [ ] **Step 3: Add mutation methods to the service layer**

```ts
// services/control-api/src/config-center/service.ts
import type {
  ConfigWriteResult,
  MaskedResolvedPluginRuntime,
  PluginInstance,
  PluginType,
  ProjectBinding,
  RepoConfigRevision
} from '@openfons/contracts';
import {
  applyPluginInstanceWrite,
  applyProjectBindingWrite,
  buildMaskedPluginInstanceView,
  getPluginType,
  listPluginInstanceRecords,
  listPluginTypes,
  loadConfigCenterState,
  loadProjectBindingRecord,
  resolveMaskedProjectRuntimeConfig,
  validateProjectConfig
} from '@openfons/config-center';

export type ConfigCenterService = {
  listPlugins: () => Array<{
    plugin: MaskedResolvedPluginRuntime;
    revision: RepoConfigRevision;
  }>;
  getPlugin: (pluginId: string) => {
    plugin: MaskedResolvedPluginRuntime;
    revision: RepoConfigRevision;
  } | undefined;
  getProjectBindings: (projectId: string) => {
    binding: ProjectBinding;
    revision: RepoConfigRevision;
  };
  writePlugin: (args: {
    projectId: string;
    pluginId: string;
    expectedRevision?: string;
    dryRun: boolean;
    plugin: PluginInstance;
  }) => Promise<ConfigWriteResult>;
  writeProjectBindings: (args: {
    projectId: string;
    expectedRevision?: string;
    dryRun: boolean;
    binding: ProjectBinding;
  }) => Promise<ConfigWriteResult>;
};
```

```ts
// services/control-api/src/config-center/service.ts
listPlugins: () => {
  const state = loadState();
  return listPluginInstanceRecords({ repoRoot }).map((record) => ({
    plugin: buildMaskedPluginInstanceView({
      plugin: record.plugin,
      secretRoot: state.secretRoot
    }),
    revision: record.revision
  }));
},
getPlugin: (pluginId) => {
  const state = loadState();
  const record = listPluginInstanceRecords({ repoRoot }).find(
    (item) => item.plugin.id === pluginId
  );
  if (!record) {
    return undefined;
  }
  return {
    plugin: buildMaskedPluginInstanceView({
      plugin: record.plugin,
      secretRoot: state.secretRoot
    }),
    revision: record.revision
  };
},
getProjectBindings: (projectId) => {
  const record = loadProjectBindingRecord({ repoRoot, projectId });
  return {
    binding: record.binding,
    revision: record.revision
  };
},
writePlugin: ({ projectId, pluginId, expectedRevision, dryRun, plugin }) =>
  applyPluginInstanceWrite({
    repoRoot,
    secretRoot,
    projectId,
    expectedRevision,
    dryRun,
    plugin: { ...plugin, id: pluginId }
  }),
writeProjectBindings: ({ projectId, expectedRevision, dryRun, binding }) =>
  applyProjectBindingWrite({
    repoRoot,
    secretRoot,
    projectId,
    expectedRevision,
    dryRun,
    binding: { ...binding, projectId }
  }),
```

- [ ] **Step 4: Add the new router endpoints**

```ts
// services/control-api/src/config-center/router.ts
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
```

- [ ] **Step 5: Re-run the config-center route tests**

Run:

`pnpm exec vitest run tests/integration/control-api-config-center.test.ts tests/integration/control-api-config-center-write.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add services/control-api/src/config-center/service.ts \
  services/control-api/src/config-center/router.ts \
  tests/integration/control-api-config-center.test.ts \
  tests/integration/control-api-config-center-write.test.ts
git commit -m "feat(control-api): add config center write routes"
```

### Task 4: Add Operator Runbook For Preview, Apply, And Recovery

**Files:**
- Create: `docs/workbench/config-center-write-path-runbook.md`

- [ ] **Step 1: Write the runbook with exact preview and apply examples**

````md
# Config Center Write Path Runbook

## Preview a plugin write

```powershell
$body = @{
  expectedRevision = "sha256:..."
  dryRun = $true
  plugin = @{
    id = "google-default"
    type = "search-provider"
    driver = "google"
    enabled = $true
    config = @{
      endpoint = "https://example.com/custom"
    }
    secrets = @{
      apiKeyRef = @{
        scheme = "secret"
        scope = "project"
        projectId = "openfons"
        name = "google-api-key"
      }
      cxRef = @{
        scheme = "secret"
        scope = "project"
        projectId = "openfons"
        name = "google-cx"
      }
    }
    dependencies = @()
    policy = @{}
  }
} | ConvertTo-Json -Depth 8

Invoke-RestMethod `
  -Method Put `
  -Uri http://localhost:3002/api/v1/config/plugins/google-default?dryRun=true `
  -ContentType 'application/json' `
  -Body $body
```

## Apply a plugin write

```powershell
Invoke-RestMethod `
  -Method Put `
  -Uri http://localhost:3002/api/v1/config/plugins/google-default `
  -ContentType 'application/json' `
  -Body $body
```

## Recover from a bad write

1. Read `backupFile` from the write response.
2. Copy that backup JSON back over the target file.
3. Re-run `POST /api/v1/config/projects/openfons/validate`.
4. Re-run any affected route preflight if the binding touches browser or crawler routes.
````

- [ ] **Step 2: Self-review the runbook against the planned API surface**

Checklist:

1. Preview uses `?dryRun=true`.
2. Apply uses the same body without `dryRun` semantics changing file shape.
3. Recovery references `backupFile` from `ConfigWriteResult`.
4. The runbook never suggests writing raw secret values into repo-visible files.

- [ ] **Step 3: Commit**

```bash
git add docs/workbench/config-center-write-path-runbook.md
git commit -m "docs(config-center): add write path runbook"
```

## Self-Review

### Spec coverage

Covered:

1. File-backed write APIs for plugin instances and project bindings: Tasks 2 and 3.
2. Atomic writes and file locking: Task 2.
3. Validation-before-write: Task 2.
4. Backup and rollback-safe flow: Task 2 and Task 4.
5. Minimal change metadata: Task 1.
6. Operator-readable preview/apply workflow inspired by `Agent-Reach`: Task 4.
7. Resource-oriented service boundaries inspired by `AiToEarn`: Tasks 2 and 3.

Deliberately deferred:

1. UI
2. Secret value mutation
3. External vaults
4. Full audit log database

### Placeholder scan

No `TODO`, `TBD`, or "implement later" placeholders remain. Each task contains exact file paths, commands, expected outcomes, and concrete code shapes.

### Type consistency

The plan consistently uses:

1. `RepoConfigRevision`
2. `PluginWriteRequest`
3. `ProjectBindingWriteRequest`
4. `ConfigWriteResult`
5. `listPluginInstanceRecords`
6. `loadProjectBindingRecord`
7. `applyPluginInstanceWrite`
8. `applyProjectBindingWrite`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-11-config-center-write-path-closure.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
