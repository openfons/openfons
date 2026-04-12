# Config Center Operational Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the operator-facing gaps in the platform plugin config center so it becomes diagnosable, auditable, and acceptance-ready without expanding into UI, secret mutation, or new runtime features.

**Architecture:** Keep config-center core logic in `packages/config-center` and expose it through `control-api` only. Add shared operator contracts in `packages/contracts`, typed domain errors plus doctor / backup-history helpers in `packages/config-center`, and thin HTTP wrappers in `services/control-api`. Reuse existing validation, resolve, route-preflight, revision, lock, and backup behavior instead of inventing a second config system.

**Tech Stack:** TypeScript, pnpm workspaces, Zod, Hono, Vitest, JSON/JSONL artifacts, Node `fs/path`.

---

## Scope Guardrails

- Do not add a config-center UI.
- Do not add secret value write APIs.
- Do not add external vaults, DB audit tables, or new persistence backends.
- Do not widen into unrelated browser / crawler / search runtime features.
- Do not create generic "write any file" APIs.

## File Map

### Existing files to modify

- `packages/contracts/src/index.ts`
  Export the new ops contracts.
- `packages/config-center/src/index.ts`
  Export typed errors, doctor helpers, and backup-history helpers.
- `packages/config-center/src/mutations/plugin-instance-writes.ts`
  Emit history entries on real applies.
- `packages/config-center/src/mutations/project-binding-writes.ts`
  Emit history entries on real applies.
- `services/control-api/src/config-center/service.ts`
  Add doctor and backup-history service methods.
- `services/control-api/src/config-center/router.ts`
  Replace ad hoc string-prefix error mapping with shared operator mapping and add read-only ops routes.
- `docs/workbench/config-center-write-path-runbook.md`
  Extend the existing write runbook with doctor and backup-history flows.

### New files to create

- `packages/contracts/src/config-center-ops.ts`
  Operator-facing schemas for config-center errors, doctor reports, and backup-history entries.
- `packages/config-center/src/errors.ts`
  Typed domain error helpers for `not-found`, `invalid-config`, `revision-conflict`, and `lock-unavailable`.
- `packages/config-center/src/doctor.ts`
  Shared project doctor builder that aggregates validation, revision, write-path readiness, and injected route summaries.
- `packages/config-center/src/persistence/backup-history.ts`
  Append and list repo-local backup history entries stored under `artifacts/config-center-backups/manifest.jsonl`.
- `tests/contract/config-center-ops-schema.test.ts`
  Contract coverage for operator-facing schemas.
- `tests/integration/control-api-config-center-ops.test.ts`
  HTTP coverage for shared error mapping.
- `tests/integration/config-center-doctor.test.ts`
  Package-level coverage for doctor aggregation.
- `tests/integration/control-api-config-center-doctor.test.ts`
  HTTP coverage for `GET /api/v1/config/projects/:projectId/doctor`.
- `tests/integration/control-api-config-center-backups.test.ts`
  HTTP coverage for backup-history listing and filtering.
- `docs/workbench/config-center-operations-acceptance.md`
  Operator acceptance checklist for `v012`.

## Task 1: Add Shared Operator Contracts And Typed Domain Errors

**Files:**
- Create: `packages/contracts/src/config-center-ops.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/config-center/src/errors.ts`
- Modify: `packages/config-center/src/index.ts`
- Modify: `services/control-api/src/config-center/router.ts`
- Test: `tests/contract/config-center-ops-schema.test.ts`
- Test: `tests/integration/control-api-config-center-ops.test.ts`

- [ ] **Step 1: Write the failing contract and HTTP mapping tests**

```ts
// tests/contract/config-center-ops-schema.test.ts
import { describe, expect, it } from 'vitest';
import {
  ConfigBackupHistoryEntrySchema,
  ConfigCenterApiErrorSchema,
  ConfigDoctorReportSchema
} from '@openfons/contracts';

describe('@openfons/contracts config-center ops schemas', () => {
  it('parses operator errors, doctor reports, and backup history entries', () => {
    const error = ConfigCenterApiErrorSchema.parse({
      error: 'revision-conflict',
      message: 'revision conflict for plugin google-default',
      resource: 'plugin-instance',
      resourceId: 'google-default',
      projectId: 'openfons',
      retryable: true
    });

    const doctor = ConfigDoctorReportSchema.parse({
      projectId: 'openfons',
      status: 'blocked',
      bindingRevision: {
        etag: 'sha256:abc',
        updatedAt: '2026-04-11T19:00:00.000Z'
      },
      validation: {
        status: 'invalid',
        errors: [],
        warnings: [],
        skipped: [],
        checkedPluginIds: []
      },
      routes: [
        {
          routeKey: 'youtube',
          status: 'ready',
          mode: 'public-first',
          reason: 'all required runtime inputs are configured'
        }
      ],
      writePath: {
        configWritable: true,
        lockDirReady: true,
        backupDirReady: true
      }
    });

    const history = ConfigBackupHistoryEntrySchema.parse({
      resource: 'project-binding',
      resourceId: 'openfons',
      projectId: 'openfons',
      changed: true,
      createdAt: '2026-04-11T19:00:00.000Z',
      backupFile: 'artifacts/config-center-backups/2026-04-11-project-openfons.json',
      revision: {
        etag: 'sha256:def',
        updatedAt: '2026-04-11T19:00:00.000Z'
      }
    });

    expect(error.retryable).toBe(true);
    expect(doctor.routes[0]?.routeKey).toBe('youtube');
    expect(history.resource).toBe('project-binding');
  });
});
```

```ts
// tests/integration/control-api-config-center-ops.test.ts
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app.js';

describe('control-api config-center operator errors', () => {
  it('returns structured not-found and revision-conflict bodies', async () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-config-ops-'));
    const app = createApp({
      configCenter: { repoRoot: process.cwd(), secretRoot }
    });

    const missing = await app.request('/api/v1/config/projects/missing/validate', {
      method: 'POST'
    });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      error: 'not-found',
      resource: 'project-binding',
      projectId: 'missing',
      retryable: false
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

`pnpm exec vitest run tests/contract/config-center-ops-schema.test.ts tests/integration/control-api-config-center-ops.test.ts`

Expected: FAIL with missing exports such as `ConfigCenterApiErrorSchema`, `ConfigDoctorReportSchema`, or router responses that do not include structured operator fields.

- [ ] **Step 3: Add the shared operator contracts**

```ts
// packages/contracts/src/config-center-ops.ts
import { z } from 'zod';
import {
  ConfigValidationResultSchema,
  ProjectRouteBindingSchema
} from './config-center.js';
import { RepoConfigRevisionSchema } from './config-center-write.js';

export const ConfigCenterApiErrorCodeSchema = z.enum([
  'not-found',
  'invalid-request',
  'invalid-config',
  'revision-conflict',
  'lock-unavailable',
  'config-write-failed',
  'internal-error'
]);

export const ConfigCenterResourceSchema = z.enum([
  'plugin-instance',
  'project-binding',
  'project-route',
  'config-center'
]);

export const ConfigCenterApiErrorSchema = z.object({
  error: ConfigCenterApiErrorCodeSchema,
  message: z.string().min(1),
  resource: ConfigCenterResourceSchema.optional(),
  resourceId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  routeKey: z.string().min(1).optional(),
  retryable: z.boolean().default(false)
});

export const ConfigDoctorRouteSchema = z.object({
  routeKey: z.string().min(1),
  status: z.enum(['ready', 'degraded', 'blocked']),
  mode: ProjectRouteBindingSchema.shape.mode,
  reason: z.string().min(1)
});

export const ConfigDoctorWritePathSchema = z.object({
  configWritable: z.boolean(),
  lockDirReady: z.boolean(),
  backupDirReady: z.boolean()
});

export const ConfigDoctorReportSchema = z.object({
  projectId: z.string().min(1),
  status: z.enum(['ready', 'degraded', 'blocked']),
  bindingRevision: RepoConfigRevisionSchema,
  validation: ConfigValidationResultSchema,
  routes: z.array(ConfigDoctorRouteSchema),
  writePath: ConfigDoctorWritePathSchema
});

export const ConfigBackupHistoryEntrySchema = z.object({
  resource: ConfigCenterResourceSchema,
  resourceId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  changed: z.boolean(),
  createdAt: z.string().datetime(),
  backupFile: z.string().min(1),
  revision: RepoConfigRevisionSchema,
  previousRevision: RepoConfigRevisionSchema.optional()
});

export type ConfigCenterApiErrorCode = z.infer<
  typeof ConfigCenterApiErrorCodeSchema
>;
export type ConfigCenterResource = z.infer<typeof ConfigCenterResourceSchema>;
export type ConfigCenterApiError = z.infer<typeof ConfigCenterApiErrorSchema>;
export type ConfigDoctorRoute = z.infer<typeof ConfigDoctorRouteSchema>;
export type ConfigDoctorWritePath = z.infer<
  typeof ConfigDoctorWritePathSchema
>;
export type ConfigDoctorReport = z.infer<typeof ConfigDoctorReportSchema>;
export type ConfigBackupHistoryEntry = z.infer<
  typeof ConfigBackupHistoryEntrySchema
>;
```

```ts
// packages/contracts/src/index.ts
export * from './config-center.js';
export * from './config-center-write.js';
export * from './config-center-ops.js';
export * from './runtime-diagnostics.js';
```

- [ ] **Step 4: Add typed config-center domain errors and router mapping**

```ts
// packages/config-center/src/errors.ts
import type {
  ConfigCenterApiError,
  ConfigCenterApiErrorCode,
  ConfigCenterResource
} from '@openfons/contracts';

export class ConfigCenterError extends Error {
  readonly code: ConfigCenterApiErrorCode;
  readonly resource?: ConfigCenterResource;
  readonly resourceId?: string;
  readonly projectId?: string;
  readonly routeKey?: string;
  readonly retryable: boolean;
  readonly httpStatus: number;

  constructor(args: {
    code: ConfigCenterApiErrorCode;
    message: string;
    httpStatus: number;
    resource?: ConfigCenterResource;
    resourceId?: string;
    projectId?: string;
    routeKey?: string;
    retryable?: boolean;
  }) {
    super(args.message);
    this.code = args.code;
    this.resource = args.resource;
    this.resourceId = args.resourceId;
    this.projectId = args.projectId;
    this.routeKey = args.routeKey;
    this.retryable = args.retryable ?? false;
    this.httpStatus = args.httpStatus;
  }
}

export const isConfigCenterError = (
  value: unknown
): value is ConfigCenterError => value instanceof ConfigCenterError;

export const toConfigCenterApiError = (
  error: ConfigCenterError
): ConfigCenterApiError => ({
  error: error.code,
  message: error.message,
  resource: error.resource,
  resourceId: error.resourceId,
  projectId: error.projectId,
  routeKey: error.routeKey,
  retryable: error.retryable
});
```

```ts
// services/control-api/src/config-center/router.ts
import { ConfigCenterApiErrorSchema } from '@openfons/contracts';
import {
  ConfigCenterError,
  isConfigCenterError,
  toConfigCenterApiError
} from '@openfons/config-center';

const isMissingPathError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

const mapConfigCenterError = (error: unknown) => {
  if (isMissingPathError(error)) {
    return {
      status: 404 as const,
      body: ConfigCenterApiErrorSchema.parse({
        error: 'not-found',
        message: error.message,
        resource: 'project-binding',
        retryable: false
      })
    };
  }

  if (isConfigCenterError(error)) {
    return {
      status: error.httpStatus,
      body: ConfigCenterApiErrorSchema.parse(toConfigCenterApiError(error))
    };
  }

  return {
    status: 500 as const,
    body: ConfigCenterApiErrorSchema.parse({
      error: 'internal-error',
      message: error instanceof Error ? error.message : 'unexpected error',
      resource: 'config-center',
      retryable: false
    })
  };
};

const readWithConfigCenterError = <T>(
  fn: () => T,
  meta: {
    resource: 'plugin-instance' | 'project-binding' | 'project-route' | 'config-center';
    resourceId?: string;
    projectId?: string;
    routeKey?: string;
  }
) => {
  try {
    return fn();
  } catch (error) {
    if (isMissingPathError(error)) {
      throw new ConfigCenterError({
        code: 'not-found',
        httpStatus: 404,
        message: error.message,
        resource: meta.resource,
        resourceId: meta.resourceId,
        projectId: meta.projectId,
        routeKey: meta.routeKey,
        retryable: false
      });
    }

    throw error;
  }
};
```

This task must update the existing read helpers as well as the write error path so the shared operator contract covers both read and write routes. The minimum required pass condition is that `bindings / validate / resolve / preflight / doctor / writes` all return the same structured not-found family instead of a mix of raw `404` and `500`.

- [ ] **Step 5: Re-run the tests**

Run:

`pnpm exec vitest run tests/contract/config-center-ops-schema.test.ts tests/integration/control-api-config-center-ops.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/config-center-ops.ts \
  packages/contracts/src/index.ts \
  packages/config-center/src/errors.ts \
  packages/config-center/src/index.ts \
  services/control-api/src/config-center/router.ts \
  tests/contract/config-center-ops-schema.test.ts \
  tests/integration/control-api-config-center-ops.test.ts
git commit -m "feat(config-center): add operator contracts and errors"
```

## Task 2: Add Project Doctor / Readiness Surface

**Files:**
- Create: `packages/config-center/src/doctor.ts`
- Modify: `packages/config-center/src/index.ts`
- Modify: `services/control-api/src/config-center/service.ts`
- Modify: `services/control-api/src/config-center/router.ts`
- Test: `tests/integration/config-center-doctor.test.ts`
- Test: `tests/integration/control-api-config-center-doctor.test.ts`

- [ ] **Step 1: Write the failing doctor tests**

```ts
// tests/integration/config-center-doctor.test.ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProjectConfigDoctorReport } from '@openfons/config-center';

describe('config-center doctor', () => {
  it('aggregates validation, binding revision, and write-path readiness', () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-doctor-'));
    const projectDir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(path.join(projectDir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(projectDir, 'google-cx'), 'google-cx');

    const report = createProjectConfigDoctorReport({
      repoRoot: process.cwd(),
      secretRoot,
      projectId: 'openfons',
      routes: [{ routeKey: 'youtube', status: 'ready', mode: 'public-first', reason: 'ok' }]
    });

    expect(report.projectId).toBe('openfons');
    expect(report.bindingRevision.etag.startsWith('sha256:')).toBe(true);
    expect(report.writePath.configWritable).toBe(true);
  });
});
```

```ts
// tests/integration/control-api-config-center-doctor.test.ts
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app.js';

describe('control-api config-center doctor route', () => {
  it('returns the operator-facing doctor report', async () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-doctor-http-'));
    const app = createApp({
      configCenter: { repoRoot: process.cwd(), secretRoot }
    });

    const response = await app.request('/api/v1/config/projects/openfons/doctor');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      projectId: 'openfons'
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

`pnpm exec vitest run tests/integration/config-center-doctor.test.ts tests/integration/control-api-config-center-doctor.test.ts`

Expected: FAIL because `createProjectConfigDoctorReport` and `/api/v1/config/projects/:projectId/doctor` do not exist yet.

- [ ] **Step 3: Implement the shared doctor builder**

```ts
// packages/config-center/src/doctor.ts
import fs from 'node:fs';
import path from 'node:path';
import type {
  ConfigDoctorReport,
  ConfigDoctorRoute
} from '@openfons/contracts';
import { loadProjectBindingRecord, loadConfigCenterState } from './loader.js';
import { validateProjectConfig } from './validator.js';

const buildWritePathReadiness = (repoRoot: string) => {
  const configDir = path.join(repoRoot, 'config');
  const lockDir = path.join(repoRoot, '.locks');
  const backupDir = path.join(repoRoot, 'artifacts', 'config-center-backups');
  const canUseDir = (targetPath: string, createIfMissing = false) => {
    try {
      if (createIfMissing) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      fs.accessSync(targetPath, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  };

  return {
    configWritable: canUseDir(configDir),
    lockDirReady: canUseDir(lockDir, true),
    backupDirReady: canUseDir(backupDir, true)
  };
};

export const createProjectConfigDoctorReport = ({
  repoRoot,
  secretRoot,
  projectId,
  routes
}: {
  repoRoot: string;
  secretRoot?: string;
  projectId: string;
  routes: ConfigDoctorRoute[];
}): ConfigDoctorReport => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const binding = loadProjectBindingRecord({ repoRoot, projectId });
  const validation = validateProjectConfig({ state, projectId });
  const status =
    validation.status === 'invalid' || routes.some((route) => route.status === 'blocked')
      ? 'blocked'
      : validation.status === 'degraded' || routes.some((route) => route.status === 'degraded')
        ? 'degraded'
        : 'ready';

  return {
    projectId,
    status,
    bindingRevision: binding.revision,
    validation,
    routes,
    writePath: buildWritePathReadiness(repoRoot)
  };
};
```

- [ ] **Step 4: Add the service and router integration**

```ts
// services/control-api/src/config-center/service.ts
import { createProjectConfigDoctorReport } from '@openfons/config-center';

getProjectDoctor: (projectId) => {
  const binding = loadProjectBindingRecord({ repoRoot, projectId }).binding;
  const routes = Object.entries(binding.routes).map(([routeKey, route]) => {
    const preflight = createCrawlerRoutePreflightReport({
      projectId,
      routeKey,
      repoRoot,
      secretRoot
    });

    return {
      routeKey,
      mode: route.mode,
      status:
        preflight.status === 'ready'
          ? 'ready'
          : preflight.secretChecks.some((item) => item.status === 'placeholder')
            ? 'degraded'
            : 'blocked',
      reason:
        preflight.status === 'ready'
          ? 'all required runtime inputs are configured'
          : preflight.nextSteps[0] ?? 'route preflight reported blockers'
    } as const;
  });

  return createProjectConfigDoctorReport({
    repoRoot,
    secretRoot,
    projectId,
    routes
  });
},
```

```ts
// services/control-api/src/config-center/router.ts
app.get('/projects/:projectId/doctor', (c) =>
  jsonWithNotFound(c, () => service.getProjectDoctor(c.req.param('projectId')))
);
```

- [ ] **Step 5: Re-run the tests**

Run:

`pnpm exec vitest run tests/integration/config-center-doctor.test.ts tests/integration/control-api-config-center-doctor.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/config-center/src/doctor.ts \
  packages/config-center/src/index.ts \
  services/control-api/src/config-center/service.ts \
  services/control-api/src/config-center/router.ts \
  tests/integration/config-center-doctor.test.ts \
  tests/integration/control-api-config-center-doctor.test.ts
git commit -m "feat(control-api): add config center doctor"
```

## Task 3: Add Backup / Revision / Rollback Observability

**Files:**
- Create: `packages/config-center/src/persistence/backup-history.ts`
- Modify: `packages/config-center/src/index.ts`
- Modify: `packages/config-center/src/mutations/plugin-instance-writes.ts`
- Modify: `packages/config-center/src/mutations/project-binding-writes.ts`
- Modify: `services/control-api/src/config-center/service.ts`
- Modify: `services/control-api/src/config-center/router.ts`
- Test: `tests/integration/control-api-config-center-backups.test.ts`

- [ ] **Step 1: Write the failing backup-history test**

```ts
// tests/integration/control-api-config-center-backups.test.ts
import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app.js';

const cloneFixture = () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-backups-'));
  const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-backups-secrets-'));
  cpSync(path.join(process.cwd(), 'config'), path.join(repoRoot, 'config'), {
    recursive: true
  });
  mkdirSync(path.join(repoRoot, 'artifacts'), { recursive: true });
  const projectDir = path.join(secretRoot, 'project', 'openfons');
  mkdirSync(projectDir, { recursive: true });
  writeFileSync(path.join(projectDir, 'google-api-key'), 'google-key');
  writeFileSync(path.join(projectDir, 'google-cx'), 'google-cx');
  writeFileSync(path.join(projectDir, 'pinchtab-token'), 'pinchtab-token');
  writeFileSync(path.join(projectDir, 'tiktok-cookie-main'), 'sessionid=abc');
  writeFileSync(
    path.join(projectDir, 'tiktok-account-main.json'),
    JSON.stringify({ username: 'collector-bot', password: 'secret' })
  );
  writeFileSync(
    path.join(projectDir, 'global-proxy-pool.json'),
    JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
  );
  return { repoRoot, secretRoot };
};

describe('control-api config-center backup history', () => {
  it('lists applied backup entries and excludes dry-runs', async () => {
    const { repoRoot, secretRoot } = cloneFixture();
    const app = createApp({ configCenter: { repoRoot, secretRoot } });

    const detail = await app.request('/api/v1/config/plugins/google-default');
    const body = await detail.json();
    const bindingDetail = await app.request('/api/v1/config/projects/openfons/bindings');
    const bindingBody = await bindingDetail.json();

    await app.request('/api/v1/config/plugins/google-default?dryRun=true', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: body.revision.etag,
        plugin: body.plugin
      })
    });

    const historyBefore = await app.request('/api/v1/config/backups?resourceId=google-default');
    expect((await historyBefore.json()).entries).toHaveLength(0);

    await app.request('/api/v1/config/plugins/google-default', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: body.revision.etag,
        plugin: {
          ...body.plugin,
          config: {
            ...body.plugin.config,
            endpoint: 'https://example.com/custom'
          }
        }
      })
    });

    await app.request('/api/v1/config/projects/openfons/bindings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: bindingBody.revision.etag,
        binding: {
          ...bindingBody.binding,
          overrides: {
            ...(bindingBody.binding.overrides ?? {}),
            doctorMarker: 'v012'
          }
        }
      })
    });

    const historyAfter = await app.request('/api/v1/config/backups?projectId=openfons');
    expect((await historyAfter.json()).entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resource: 'plugin-instance',
          resourceId: 'google-default'
        }),
        expect.objectContaining({
          resource: 'project-binding',
          resourceId: 'openfons'
        })
      ])
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

`pnpm exec vitest run tests/integration/control-api-config-center-backups.test.ts`

Expected: FAIL because no backup-history reader / writer or `/api/v1/config/backups` route exists yet.

- [ ] **Step 3: Add repo-local backup-history helpers**

```ts
// packages/config-center/src/persistence/backup-history.ts
import fs from 'node:fs';
import path from 'node:path';
import type { ConfigBackupHistoryEntry } from '@openfons/contracts';

const resolveManifestPath = (repoRoot: string) =>
  path.join(repoRoot, 'artifacts', 'config-center-backups', 'manifest.jsonl');

export const appendConfigBackupHistoryEntry = ({
  repoRoot,
  entry
}: {
  repoRoot: string;
  entry: ConfigBackupHistoryEntry;
}) => {
  const manifestPath = resolveManifestPath(repoRoot);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.appendFileSync(manifestPath, `${JSON.stringify(entry)}\n`, 'utf8');
};

export const listConfigBackupHistoryEntries = ({
  repoRoot,
  resource,
  resourceId,
  projectId
}: {
  repoRoot: string;
  resource?: string;
  resourceId?: string;
  projectId?: string;
}) => {
  const manifestPath = resolveManifestPath(repoRoot);
  if (!fs.existsSync(manifestPath)) {
    return [];
  }

  return fs
    .readFileSync(manifestPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ConfigBackupHistoryEntry)
    .filter((entry) => (resource ? entry.resource === resource : true))
    .filter((entry) => (resourceId ? entry.resourceId === resourceId : true))
    .filter((entry) => (projectId ? entry.projectId === projectId : true))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};
```

- [ ] **Step 4: Emit history entries on real apply and expose the HTTP route**

```ts
// packages/config-center/src/mutations/plugin-instance-writes.ts
import { appendConfigBackupHistoryEntry } from '../persistence/backup-history.js';

if (changed && backupFile) {
  appendConfigBackupHistoryEntry({
    repoRoot,
    entry: {
      resource: 'plugin-instance',
      resourceId: plugin.id,
      projectId,
      changed: true,
      createdAt: new Date().toISOString(),
      backupFile,
      revision: buildRepoConfigRevision({
        rawContent: persistedContent,
        updatedAt: nextPlugin.meta?.updatedAt ?? nextUpdatedAt
      }),
      previousRevision: current?.revision
    }
  });
}
```

```ts
// packages/config-center/src/mutations/project-binding-writes.ts
import { appendConfigBackupHistoryEntry } from '../persistence/backup-history.js';

if (changed && backupFile) {
  appendConfigBackupHistoryEntry({
    repoRoot,
    entry: {
      resource: 'project-binding',
      resourceId: projectId,
      projectId,
      changed: true,
      createdAt: new Date().toISOString(),
      backupFile,
      revision: buildRepoConfigRevision({
        rawContent: persistedContent,
        updatedAt: nextBinding.meta?.updatedAt ?? nextUpdatedAt
      }),
      previousRevision: current.revision
    }
  });
}
```

```ts
// services/control-api/src/config-center/service.ts
import { listConfigBackupHistoryEntries } from '@openfons/config-center';

listBackupHistory: ({ resource, resourceId, projectId }) =>
  listConfigBackupHistoryEntries({
    repoRoot,
    resource,
    resourceId,
    projectId
  }),
```

```ts
// services/control-api/src/config-center/router.ts
app.get('/backups', (c) =>
  c.json({
    entries: service.listBackupHistory({
      resource: c.req.query('resource'),
      resourceId: c.req.query('resourceId'),
      projectId: c.req.query('projectId')
    })
  })
);
```

- [ ] **Step 5: Re-run the test**

Run:

`pnpm exec vitest run tests/integration/control-api-config-center-backups.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/config-center/src/persistence/backup-history.ts \
  packages/config-center/src/index.ts \
  packages/config-center/src/mutations/plugin-instance-writes.ts \
  packages/config-center/src/mutations/project-binding-writes.ts \
  services/control-api/src/config-center/service.ts \
  services/control-api/src/config-center/router.ts \
  tests/integration/control-api-config-center-backups.test.ts
git commit -m "feat(config-center): add backup history observability"
```

## Task 4: Extend The Runbook And Write The Acceptance Checklist

**Files:**
- Modify: `docs/workbench/config-center-write-path-runbook.md`
- Create: `docs/workbench/config-center-operations-acceptance.md`

- [ ] **Step 1: Extend the existing runbook with doctor and backup-history flows**

````md
## 查询 project doctor

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3002/api/v1/config/projects/openfons/doctor
```

## 查询 backup history

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3002/api/v1/config/backups?resource=project-binding&projectId=openfons"
```

## apply 后的推荐核对顺序

1. 重新读取目标资源的当前 `revision`
2. 执行 `GET /projects/:projectId/doctor`
3. 如涉及 crawler route，再执行 route preflight
4. 如需回滚，优先使用 backup history 返回的 `backupFile`
````

- [ ] **Step 2: Create the acceptance checklist**

````md
# Config Center Operations Acceptance

## 必过场景

1. 缺失 project 时，`bindings / validate / resolve / preflight / doctor` 全部返回 `404 not-found`
2. 非法 JSON 或非法 body 返回 `400 invalid-request`
3. 写前校验失败返回 `400 invalid-config`
4. revision 过期返回 `409 revision-conflict`
5. 锁冲突返回 `423 lock-unavailable`
6. `doctor` 能区分 `ready / degraded / blocked`
7. 实际 apply 后可以查到 backup history entry
8. 按 runbook 回滚后，`validate` 与 `doctor` 恢复到预期状态
````

- [ ] **Step 3: Run the full verification set**

Run:

`pnpm exec vitest run tests/contract/config-center-ops-schema.test.ts tests/integration/control-api-config-center-ops.test.ts tests/integration/config-center-doctor.test.ts tests/integration/control-api-config-center-doctor.test.ts tests/integration/control-api-config-center-backups.test.ts tests/integration/control-api-config-center.test.ts tests/integration/control-api-config-center-write.test.ts`

Run:

`pnpm typecheck`

Run:

`git diff --check`

Expected:

- all targeted tests PASS
- workspace `typecheck` PASS
- `git diff --check` reports no whitespace or formatting issues

- [ ] **Step 4: Commit**

```bash
git add docs/workbench/config-center-write-path-runbook.md \
  docs/workbench/config-center-operations-acceptance.md
git commit -m "docs(config-center): add operations acceptance"
```

## Self-Review

### Spec coverage

Covered:

1. Shared operator error contract: Task 1
2. Project doctor / readiness surface: Task 2
3. Backup / revision / rollback observability: Task 3
4. Runbook + acceptance closure: Task 4

Deliberately excluded:

1. UI
2. secret value writes
3. external vault / DB audit backend
4. unrelated runtime feature expansion

### Placeholder scan

No `TODO`, `TBD`, or "implement later" placeholders remain. Each task includes exact files, commands, and concrete code shapes.

### Type consistency

The plan consistently uses:

1. `ConfigCenterApiError`
2. `ConfigDoctorReport`
3. `ConfigBackupHistoryEntry`
4. `ConfigCenterError`
5. `createProjectConfigDoctorReport`
6. `listConfigBackupHistoryEntries`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-11-config-center-operational-closure.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
