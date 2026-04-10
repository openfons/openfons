# Crawler Runtime Preflight and Secret Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add route-aware crawler runtime diagnostics and safe local secret/bootstrap tooling so operators can identify and prepare `youtube / tiktok` smoke prerequisites before executing real crawlers.

**Architecture:** Add a shared diagnostics contract, then implement the preflight core in the `control-api` crawler execution slice because it needs both config-center graph data and host dependency checks. Expose the report through a read-only `control-api` endpoint and a local workbench CLI; keep write/bootstrap behavior CLI-only and placeholder-safe.

**Tech Stack:** TypeScript, Zod contracts, Hono control-api routes, Vitest integration tests, `tsx`, PowerShell-compatible operator commands, Node `fs/path/child_process`.

---

## File Map

### New files

- `packages/contracts/src/runtime-diagnostics.ts`
  Shared schemas and types for crawler preflight reports, checks, and bootstrap actions.
- `services/control-api/src/collection/crawler-execution/preflight.ts`
  Route-aware diagnostics and local bootstrap implementation.
- `scripts/workbench/doctor-crawler-runtime.ts`
  Operator CLI for preflight JSON output and safe bootstrap.
- `tests/integration/crawler-runtime-preflight.test.ts`
  Core diagnostics and bootstrap coverage.
- `tests/integration/crawler-runtime-doctor.test.ts`
  CLI behavior coverage.
- `docs/workbench/generated/crawler-runtime-preflight-youtube.json`
  Latest YouTube preflight artifact.
- `docs/workbench/generated/crawler-runtime-preflight-tiktok.json`
  Latest TikTok preflight artifact.

### Existing files to modify

- `packages/contracts/src/index.ts`
  Export diagnostics contracts.
- `services/control-api/src/config-center/service.ts`
  Add read-only `getCrawlerRoutePreflight`.
- `services/control-api/src/config-center/router.ts`
  Add route preflight endpoint.
- `tests/integration/control-api-config-center.test.ts`
  Cover the API endpoint without leaking secrets.
- `package.json`
  Add `doctor:crawler-runtime` script.
- `docs/superpowers/2026-04-10-crawler-execution-smoke-runbook.md`
  Start the workflow with diagnostics before smoke execution.
- `Memory/02_todos/todo_v008_001_20260410.md`
  Track v008 milestones as they complete.
- `Memory/03_chat_logs/<timestamp>.md`
  Append the session summary at the end of the phase.

---

### Task 1: Add diagnostics contracts and read-only preflight core

**Files:**
- Create: `packages/contracts/src/runtime-diagnostics.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `services/control-api/src/collection/crawler-execution/preflight.ts`
- Create: `tests/integration/crawler-runtime-preflight.test.ts`

- [ ] **Step 1: Write the failing preflight test**

Create `tests/integration/crawler-runtime-preflight.test.ts` with these initial cases:

```ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createCrawlerRoutePreflightReport,
  bootstrapCrawlerRoutePreflight
} from '../../services/control-api/src/collection/crawler-execution/preflight.js';

const createSecretRoot = () => {
  const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-preflight-'));
  mkdirSync(path.join(secretRoot, 'project', 'openfons'), { recursive: true });
  return secretRoot;
};

describe('crawler runtime preflight', () => {
  it('reports the current YouTube blocker without requiring TikTok secrets', () => {
    const secretRoot = createSecretRoot();

    const report = createCrawlerRoutePreflightReport({
      projectId: 'openfons',
      routeKey: 'youtube',
      repoRoot: process.cwd(),
      secretRoot,
      env: {},
      commandExists: () => false
    });

    expect(report.status).toBe('blocked');
    expect(report.route).toMatchObject({
      routeKey: 'youtube',
      driver: 'yt-dlp',
      mode: 'public-first'
    });
    expect(report.secretChecks.map((item) => item.key)).toEqual([
      'global-proxy-pool'
    ]);
    expect(report.secretChecks[0]).toMatchObject({
      status: 'missing',
      message: 'global-proxy-pool secret poolRef was not found'
    });
    expect(report.hostChecks.some((item) => item.key === 'yt-dlp')).toBe(true);
    expect(JSON.stringify(report)).not.toContain('tiktok-account-main');
  });

  it('reports all TikTok route secret blockers without printing secret values', () => {
    const secretRoot = createSecretRoot();

    const report = createCrawlerRoutePreflightReport({
      projectId: 'openfons',
      routeKey: 'tiktok',
      repoRoot: process.cwd(),
      secretRoot,
      env: {},
      commandExists: () => true
    });

    expect(report.status).toBe('blocked');
    expect(report.secretChecks.map((item) => item.key)).toEqual([
      'pinchtab-token',
      'tiktok-account-main',
      'tiktok-cookie-main',
      'global-proxy-pool'
    ]);
    expect(report.secretChecks.every((item) => item.status === 'missing')).toBe(
      true
    );
    expect(JSON.stringify(report)).not.toContain('not-for-repo');
  });

  it('keeps placeholder files blocked after bootstrap', () => {
    const secretRoot = createSecretRoot();

    const bootstrap = bootstrapCrawlerRoutePreflight({
      projectId: 'openfons',
      routeKey: 'tiktok',
      repoRoot: process.cwd(),
      secretRoot,
      env: {},
      commandExists: () => true,
      runUvSync: async () => ({ status: 'skipped', message: 'not requested' })
    });

    const report = createCrawlerRoutePreflightReport({
      projectId: 'openfons',
      routeKey: 'tiktok',
      repoRoot: process.cwd(),
      secretRoot,
      env: {},
      commandExists: () => true
    });

    expect(bootstrap.actions.some((item) => item.status === 'created')).toBe(true);
    expect(report.status).toBe('blocked');
    expect(report.secretChecks.map((item) => item.status)).toContain(
      'placeholder'
    );
  });

  it('marks a fully prepared YouTube route as ready when host command is available', () => {
    const secretRoot = createSecretRoot();
    const dir = path.join(secretRoot, 'project', 'openfons');
    writeFileSync(
      path.join(dir, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const report = createCrawlerRoutePreflightReport({
      projectId: 'openfons',
      routeKey: 'youtube',
      repoRoot: process.cwd(),
      secretRoot,
      env: {},
      commandExists: (command) => command === 'yt-dlp',
      envUvPythonExists: () => true
    });

    expect(report.status).toBe('ready');
    expect(report.nextSteps).toContain(
      'Run pnpm smoke:crawler-execution -- --route youtube --out docs/workbench/generated/crawler-execution-smoke-youtube.json'
    );
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
pnpm exec vitest run tests/integration/crawler-runtime-preflight.test.ts
```

Expected: FAIL because `preflight.ts` and diagnostics contracts do not exist.

- [ ] **Step 3: Add diagnostics contracts**

Create `packages/contracts/src/runtime-diagnostics.ts`:

```ts
import { z } from 'zod';

export const RuntimeCheckStatusSchema = z.enum([
  'ok',
  'missing',
  'placeholder',
  'invalid',
  'skipped'
]);

export const RuntimePreflightStatusSchema = z.enum(['ready', 'blocked']);

export const RuntimePreflightCheckSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  status: RuntimeCheckStatusSchema,
  message: z.string().min(1),
  command: z.string().min(1).optional(),
  envVar: z.string().min(1).optional(),
  filePath: z.string().min(1).optional(),
  candidatePaths: z.array(z.string().min(1)).default([]),
  pluginId: z.string().min(1).optional(),
  field: z.string().min(1).optional()
});

export const RuntimeBootstrapActionSchema = z.object({
  key: z.string().min(1),
  status: z.enum(['created', 'skipped', 'failed']),
  path: z.string().min(1).optional(),
  message: z.string().min(1)
});

export const CrawlerRouteSummarySchema = z.object({
  routeKey: z.string().min(1),
  mode: z.enum(['public-first', 'requires-auth']),
  driver: z.string().min(1),
  collectionPluginId: z.string().min(1)
});

export const CrawlerRoutePreflightReportSchema = z.object({
  projectId: z.string().min(1),
  routeKey: z.string().min(1),
  secretRoot: z.string().min(1),
  status: RuntimePreflightStatusSchema,
  route: CrawlerRouteSummarySchema.nullable(),
  hostChecks: z.array(RuntimePreflightCheckSchema),
  secretChecks: z.array(RuntimePreflightCheckSchema),
  bootstrapActions: z.array(RuntimeBootstrapActionSchema).default([]),
  nextSteps: z.array(z.string().min(1)).default([])
});

export type RuntimeCheckStatus = z.infer<typeof RuntimeCheckStatusSchema>;
export type RuntimePreflightStatus = z.infer<
  typeof RuntimePreflightStatusSchema
>;
export type RuntimePreflightCheck = z.infer<
  typeof RuntimePreflightCheckSchema
>;
export type RuntimeBootstrapAction = z.infer<
  typeof RuntimeBootstrapActionSchema
>;
export type CrawlerRouteSummary = z.infer<typeof CrawlerRouteSummarySchema>;
export type CrawlerRoutePreflightReport = z.infer<
  typeof CrawlerRoutePreflightReportSchema
>;
```

Modify `packages/contracts/src/index.ts`:

```ts
export * from './config-center.js';
export * from './runtime-diagnostics.js';
```

- [ ] **Step 4: Implement the preflight core**

Create `services/control-api/src/collection/crawler-execution/preflight.ts` with these exported APIs:

```ts
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type {
  CrawlerRoutePreflightReport,
  RuntimeBootstrapAction,
  RuntimePreflightCheck
} from '@openfons/contracts';
import {
  CrawlerRoutePreflightReportSchema
} from '@openfons/contracts';
import {
  expandPluginDependencyClosure,
  loadConfigCenterState,
  loadProjectBinding,
  resolveSecretValue
} from '@openfons/config-center';
import type { PluginInstance, SecretRef } from '@openfons/contracts';

type CommandExists = (command: string) => boolean;
type EnvUvPythonExists = (repoRoot: string) => boolean;

export type CrawlerRoutePreflightOptions = {
  projectId: string;
  routeKey: string;
  repoRoot: string;
  secretRoot?: string;
  env?: NodeJS.ProcessEnv;
  commandExists?: CommandExists;
  envUvPythonExists?: EnvUvPythonExists;
};

export type BootstrapCrawlerRoutePreflightOptions =
  CrawlerRoutePreflightOptions & {
    runUvSync?: () => Promise<RuntimeBootstrapAction>;
  };

const commandExists: CommandExists = (command) => {
  if (command.includes('\\') || command.includes('/')) {
    return existsSync(command);
  }

  const probe = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], {
    encoding: 'utf8',
    windowsHide: true
  });

  return probe.status === 0;
};

const defaultEnvUvPythonExists: EnvUvPythonExists = (repoRoot) =>
  existsSync(
    process.platform === 'win32'
      ? path.join(repoRoot, '.env_uv', 'Scripts', 'python.exe')
      : path.join(repoRoot, '.env_uv', 'bin', 'python')
  );

const candidateSecretPaths = ({
  secretRoot,
  ref
}: {
  secretRoot: string;
  ref: SecretRef;
}) => {
  const base =
    ref.scope === 'project'
      ? path.join(secretRoot, 'project', ref.projectId as string, ref.name)
      : path.join(secretRoot, 'global', ref.name);

  return [base, `${base}.txt`, `${base}.json`];
};

export const createCrawlerRoutePreflightReport = (
  options: CrawlerRoutePreflightOptions
): CrawlerRoutePreflightReport => {
  const context = loadPreflightContext(options);
  const hostChecks = buildHostChecks(context);
  const secretChecks = buildSecretChecks(context);
  const report = {
    projectId: context.projectId,
    routeKey: context.routeKey,
    secretRoot: context.secretRoot,
    status: [...hostChecks, ...secretChecks].every((item) => item.status === 'ok')
      ? 'ready'
      : 'blocked',
    route: context.routeSummary,
    hostChecks,
    secretChecks,
    bootstrapActions: [],
    nextSteps: buildNextSteps({
      routeKey: context.routeKey,
      status:
        [...hostChecks, ...secretChecks].every((item) => item.status === 'ok')
          ? 'ready'
          : 'blocked',
      hostChecks,
      secretChecks
    })
  };

  return CrawlerRoutePreflightReportSchema.parse(report);
};

export const bootstrapCrawlerRoutePreflight = (
  options: BootstrapCrawlerRoutePreflightOptions
): CrawlerRoutePreflightReport => {
  const context = loadPreflightContext(options);
  const actions = createMissingBootstrapArtifacts(context, options);
  const report = createCrawlerRoutePreflightReport(options);

  return CrawlerRoutePreflightReportSchema.parse({
    ...report,
    bootstrapActions: actions
  });
};
```

Implementation requirements:

- Define these internal helpers in `preflight.ts`:

```ts
const loadPreflightContext = (options: CrawlerRoutePreflightOptions) => ({ /* ... */ });
const buildHostChecks = (context: PreflightContext): RuntimePreflightCheck[] => [];
const buildSecretChecks = (context: PreflightContext): RuntimePreflightCheck[] => [];
const buildNextSteps = (args: {
  routeKey: string;
  status: 'ready' | 'blocked';
  hostChecks: RuntimePreflightCheck[];
  secretChecks: RuntimePreflightCheck[];
}) => [] as string[];
const createMissingBootstrapArtifacts = (
  context: PreflightContext,
  options: BootstrapCrawlerRoutePreflightOptions
) => [] as RuntimeBootstrapAction[];
```

- The final code must not keep placeholder comments that describe future work.
- `commandExists()` must support direct file paths and PATH command lookup.
- Secret placeholder detection must keep these values blocked:
  - `REPLACE_WITH_PINCHTAB_TOKEN`
  - `REPLACE_ME` in account/proxy JSON
  - `REPLACE_WITH_NETSCAPE_COOKIE_FILE_CONTAINING_MS_TOKEN`
- TikTok cookie checks must not print the cookie content; only report whether an `ms_token` or `msToken` marker is present.
- Bootstrap must create only missing files and must not overwrite existing files.

- [ ] **Step 5: Run core tests and typecheck**

Run:

```powershell
pnpm exec vitest run tests/integration/crawler-runtime-preflight.test.ts
pnpm exec tsc -p services/control-api/tsconfig.json --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add packages/contracts/src/runtime-diagnostics.ts packages/contracts/src/index.ts `
  services/control-api/src/collection/crawler-execution/preflight.ts `
  tests/integration/crawler-runtime-preflight.test.ts
git commit -m "feat(smoke): add crawler runtime preflight core"
```

### Task 2: Expose read-only diagnostics through control-api

**Files:**
- Modify: `services/control-api/src/config-center/service.ts`
- Modify: `services/control-api/src/config-center/router.ts`
- Modify: `tests/integration/control-api-config-center.test.ts`

- [ ] **Step 1: Add failing API coverage**

Extend `tests/integration/control-api-config-center.test.ts`:

```ts
const preflightResponse = await incompleteApp.request(
  '/api/v1/config/projects/openfons/routes/youtube/preflight',
  { method: 'POST' }
);
expect(preflightResponse.status).toBe(200);
const preflight = await preflightResponse.json();
expect(preflight).toMatchObject({
  projectId: 'openfons',
  routeKey: 'youtube',
  status: 'blocked'
});
expect(JSON.stringify(preflight)).toContain('global-proxy-pool');
expect(JSON.stringify(preflight)).not.toContain('not-for-repo');
```

- [ ] **Step 2: Run the API test to verify it fails**

Run:

```powershell
pnpm exec vitest run tests/integration/control-api-config-center.test.ts
```

Expected: FAIL because the endpoint does not exist yet.

- [ ] **Step 3: Add service method**

Modify `services/control-api/src/config-center/service.ts`:

```ts
import { createCrawlerRoutePreflightReport } from '../collection/crawler-execution/preflight.js';
```

Add to `ConfigCenterService`:

```ts
  getCrawlerRoutePreflight: (args: {
    projectId: string;
    routeKey: string;
  }) => ReturnType<typeof createCrawlerRoutePreflightReport>;
```

Add implementation:

```ts
    getCrawlerRoutePreflight: ({ projectId, routeKey }) =>
      createCrawlerRoutePreflightReport({
        projectId,
        routeKey,
        repoRoot,
        secretRoot
      })
```

- [ ] **Step 4: Add route**

Modify `services/control-api/src/config-center/router.ts`:

```ts
  app.post('/projects/:projectId/routes/:routeKey/preflight', (c) =>
    c.json(
      service.getCrawlerRoutePreflight({
        projectId: c.req.param('projectId'),
        routeKey: c.req.param('routeKey')
      })
    )
  );
```

- [ ] **Step 5: Verify**

Run:

```powershell
pnpm exec vitest run tests/integration/control-api-config-center.test.ts tests/integration/crawler-runtime-preflight.test.ts
pnpm exec tsc -p services/control-api/tsconfig.json --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add services/control-api/src/config-center/service.ts `
  services/control-api/src/config-center/router.ts `
  tests/integration/control-api-config-center.test.ts
git commit -m "feat(control-api): expose crawler runtime preflight"
```

### Task 3: Add operator CLI and safe bootstrap

**Files:**
- Create: `scripts/workbench/doctor-crawler-runtime.ts`
- Create: `tests/integration/crawler-runtime-doctor.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add failing CLI tests**

Create `tests/integration/crawler-runtime-doctor.test.ts`:

```ts
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

describe('crawler runtime doctor CLI', () => {
  it('returns non-zero exit for blocked reports and prints JSON', async () => {
    vi.resetModules();
    const exitHandler = vi.fn();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { runDoctorCommand } = await import(
      '../../scripts/workbench/doctor-crawler-runtime.ts'
    );

    const result = await runDoctorCommand({
      args: ['--route', 'youtube', '--secret-root', mkdtempSync(path.join(os.tmpdir(), 'openfons-doctor-'))],
      exitHandler,
      commandExists: () => false
    });

    expect(result.status).toBe('blocked');
    expect(exitHandler).toHaveBeenCalledWith(1);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm exec vitest run tests/integration/crawler-runtime-doctor.test.ts
```

Expected: FAIL because the CLI file does not exist.

- [ ] **Step 3: Implement CLI**

Create `scripts/workbench/doctor-crawler-runtime.ts`:

```ts
import path from 'node:path';
import {
  bootstrapCrawlerRoutePreflight,
  createCrawlerRoutePreflightReport,
  type CrawlerRoutePreflightOptions
} from '../../services/control-api/src/collection/crawler-execution/preflight.js';

type DoctorRoute = 'youtube' | 'tiktok';

const parseArgs = (args: string[]) => {
  const route = args[args.indexOf('--route') + 1] as DoctorRoute | undefined;
  const projectId =
    args.includes('--project') ? args[args.indexOf('--project') + 1] : 'openfons';
  const secretRoot = args.includes('--secret-root')
    ? path.resolve(process.cwd(), args[args.indexOf('--secret-root') + 1])
    : process.env.OPENFONS_SECRET_ROOT;
  const bootstrapMissing = args.includes('--bootstrap-missing');

  if (route !== 'youtube' && route !== 'tiktok') {
    throw new Error('usage: --route youtube|tiktok [--project openfons] [--secret-root path] [--bootstrap-missing]');
  }

  return {
    route,
    projectId,
    secretRoot,
    bootstrapMissing
  };
};

export const runDoctorCommand = async ({
  args = process.argv.slice(2),
  exitHandler = (code: number) => {
    process.exitCode = code;
  },
  commandExists
}: {
  args?: string[];
  exitHandler?: (code: number) => void;
  commandExists?: CrawlerRoutePreflightOptions['commandExists'];
} = {}) => {
  const parsed = parseArgs(args);
  const baseOptions = {
    projectId: parsed.projectId,
    routeKey: parsed.route,
    repoRoot: process.cwd(),
    secretRoot: parsed.secretRoot,
    commandExists
  };
  const report = parsed.bootstrapMissing
    ? bootstrapCrawlerRoutePreflight(baseOptions)
    : createCrawlerRoutePreflightReport(baseOptions);

  console.log(JSON.stringify(report, null, 2));

  if (report.status === 'blocked') {
    exitHandler(1);
  }

  return report;
};

const main = async () => {
  try {
    await runDoctorCommand();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
};

main();
```

- [ ] **Step 4: Add package script**

Modify `package.json`:

```json
"doctor:crawler-runtime": "tsx scripts/workbench/doctor-crawler-runtime.ts"
```

- [ ] **Step 5: Verify**

Run:

```powershell
pnpm exec vitest run tests/integration/crawler-runtime-doctor.test.ts tests/integration/crawler-runtime-preflight.test.ts
pnpm exec tsc -p services/control-api/tsconfig.json --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add scripts/workbench/doctor-crawler-runtime.ts `
  tests/integration/crawler-runtime-doctor.test.ts `
  package.json
git commit -m "feat(smoke): add crawler runtime doctor cli"
```

### Task 4: Update runbook, record diagnostics artifacts, and update Memory

**Files:**
- Modify: `docs/superpowers/2026-04-10-crawler-execution-smoke-runbook.md`
- Create: `docs/workbench/generated/crawler-runtime-preflight-youtube.json`
- Create: `docs/workbench/generated/crawler-runtime-preflight-tiktok.json`
- Modify: `Memory/02_todos/todo_v008_001_20260410.md`
- Add/Modify: `Memory/03_chat_logs/<timestamp>.md`

- [ ] **Step 1: Update runbook with doctor-first workflow**

Add a section before `## YouTube smoke`:

```md
## Runtime preflight

Run these before smoke:

```powershell
pnpm doctor:crawler-runtime -- --route youtube `
  --secret-root "$env:OPENFONS_SECRET_ROOT" `
  > docs/workbench/generated/crawler-runtime-preflight-youtube.json

pnpm doctor:crawler-runtime -- --route tiktok `
  --secret-root "$env:OPENFONS_SECRET_ROOT" `
  > docs/workbench/generated/crawler-runtime-preflight-tiktok.json
```

If a route reports `"status": "blocked"`, fix the listed `hostChecks` and `secretChecks` before running smoke.

To create missing placeholder secret files:

```powershell
pnpm doctor:crawler-runtime -- --route tiktok `
  --secret-root "$env:OPENFONS_SECRET_ROOT" `
  --bootstrap-missing
```

Placeholder files are intentionally still reported as blocked until replaced with real operator-managed material.
```

- [ ] **Step 2: Run diagnostics and capture artifacts**

Run:

```powershell
$env:OPENFONS_SECRET_ROOT = "$env:USERPROFILE\\.openfons\\secrets"
pnpm doctor:crawler-runtime -- --route youtube --secret-root "$env:OPENFONS_SECRET_ROOT" *> docs/workbench/generated/crawler-runtime-preflight-youtube.json
pnpm doctor:crawler-runtime -- --route tiktok --secret-root "$env:OPENFONS_SECRET_ROOT" *> docs/workbench/generated/crawler-runtime-preflight-tiktok.json
```

Expected: files are written. If the CLI exits `1`, keep the artifact and do not rewrite the error by hand.

- [ ] **Step 3: Review artifacts**

Run:

```powershell
Get-Content docs/workbench/generated/crawler-runtime-preflight-youtube.json
Get-Content docs/workbench/generated/crawler-runtime-preflight-tiktok.json
```

Expected: JSON contains route-specific blockers and does not contain real secret values.

- [ ] **Step 4: Update Memory**

Update `Memory/02_todos/todo_v008_001_20260410.md`:

```md
- [x] 产出 `runtime diagnostics / secret bootstrap` 设计文档
- [x] 产出 `runtime diagnostics / secret bootstrap` 实现计划
- [x] 落地 route-aware diagnostics core
- [x] 暴露 `control-api` diagnostics 接口
- [x] 落地 operator CLI / bootstrap 入口
- [x] 更新 runbook 并复跑 `youtube / tiktok` smoke
- [ ] 基于新一轮 diagnostics + smoke 结果决定是否回到 adapter 扩展主线
```

Append a chat-log summary that records the exact artifact paths and the next decision.

- [ ] **Step 5: Final verification**

Run:

```powershell
pnpm exec vitest run tests/integration/crawler-runtime-preflight.test.ts tests/integration/crawler-runtime-doctor.test.ts tests/integration/control-api-config-center.test.ts
pnpm exec tsc -p services/control-api/tsconfig.json --noEmit
git diff --check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add docs/superpowers/2026-04-10-crawler-execution-smoke-runbook.md `
  docs/workbench/generated/crawler-runtime-preflight-youtube.json `
  docs/workbench/generated/crawler-runtime-preflight-tiktok.json
git commit -m "docs(smoke): record crawler runtime preflight"

git add -f Memory/02_todos/todo_v008_001_20260410.md Memory/03_chat_logs
git commit -m "memorytree(v008): record runtime diagnostics progress"
```

## Self-Review

### Spec coverage

- Route-aware diagnostics: Task 1.
- Read-only `control-api` endpoint: Task 2.
- Local CLI and safe bootstrap: Task 3.
- Runbook and artifacts: Task 4.
- Placeholder secrets remain blocked: Task 1 and Task 3.
- No new adapter work: all tasks stay within diagnostics, API, CLI, docs, and Memory.

### Placeholder scan

The plan intentionally includes placeholder secret strings such as `REPLACE_WITH_PINCHTAB_TOKEN`; these are required test and bootstrap sentinels, not incomplete plan placeholders. No unresolved implementation gaps should remain in committed code.

### Type consistency

The plan consistently uses:

- `CrawlerRoutePreflightReport`
- `RuntimePreflightCheck`
- `RuntimeBootstrapAction`
- `createCrawlerRoutePreflightReport`
- `bootstrapCrawlerRoutePreflight`
- `doctor:crawler-runtime`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-10-crawler-runtime-preflight-and-secret-bootstrap.md`. Because the user has already approved the recommended route, continue with subagent-driven execution unless a reviewer finds a blocking plan issue.
