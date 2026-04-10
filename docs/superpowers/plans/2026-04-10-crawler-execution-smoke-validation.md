# Crawler Execution Smoke Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal, repeatable smoke-validation path for the `youtube` and `tiktok` crawler routes so operators can verify real host/runtime readiness without guessing how to run v006 manually.

**Architecture:** Keep smoke validation out of the main product path. Add a small harness that reuses the real config-center runtime resolver, dispatcher, and runners, but drives them through direct route-level inputs instead of the AI procurement compile/search chain. Pair that harness with an operator runbook and committed result artifacts so each smoke run produces repeatable evidence or a concrete blocker list.

**Tech Stack:** TypeScript, `tsx`, Vitest, Node `child_process`, PowerShell, `uv`, project-root `.env_uv`, `yt-dlp`, `TikTokApi`

---

## File Map

### Existing files to modify

- `package.json`
  Add a stable script alias for the smoke harness.
- `Memory/02_todos/todo_v007_001_20260410.md`
  Mark plan/runbook/smoke milestones as they complete.

### New code files

- `services/control-api/src/collection/crawler-execution/smoke.ts`
  Route-level smoke harness that resolves runtime, executes the real runner, and returns structured JSON.
- `scripts/workbench/smoke-crawler-execution.ts`
  CLI entrypoint for operators and future agents.
- `tests/integration/crawler-execution-smoke.test.ts`
  Harness coverage for runtime resolution, JSON output, and failure semantics.

### New docs and generated artifacts

- `docs/superpowers/2026-04-10-crawler-execution-smoke-runbook.md`
  Operator-facing prerequisite and execution runbook.
- `docs/workbench/generated/crawler-execution-smoke-youtube.json`
  Committed smoke artifact for the latest YouTube run.
- `docs/workbench/generated/crawler-execution-smoke-tiktok.json`
  Committed smoke artifact for the latest TikTok run.

---

### Task 1: Add a dedicated crawler-execution smoke harness

**Files:**
- Create: `services/control-api/src/collection/crawler-execution/smoke.ts`
- Create: `scripts/workbench/smoke-crawler-execution.ts`
- Create: `tests/integration/crawler-execution-smoke.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing smoke-harness test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { runCrawlerExecutionSmoke } from '../../services/control-api/src/collection/crawler-execution/smoke.js';

describe('crawler execution smoke harness', () => {
  it('resolves the requested route, executes the dispatcher, and returns structured output', async () => {
    const resolveRuntime = vi.fn(() => ({
      routeKey: 'youtube',
      mode: 'public-first',
      collection: {
        pluginId: 'youtube-adapter',
        type: 'crawler-adapter',
        driver: 'yt-dlp',
        config: {},
        secrets: {}
      },
      browser: undefined,
      accounts: [],
      cookies: [],
      proxy: {
        pluginId: 'global-proxy-pool',
        type: 'proxy-source',
        driver: 'static-proxy-file',
        config: {},
        secrets: {
          poolRef: {
            value: [{ endpoint: 'http://proxy.local:9000' }]
          }
        }
      }
    }));
    const run = vi.fn(async () => ({
      sourceCapture: {
        id: 'capture_001',
        topicRunId: 'topic_001',
        title: 'YouTube smoke capture',
        url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        sourceKind: 'official',
        useAs: 'primary',
        reportability: 'reportable',
        riskLevel: 'low',
        captureType: 'doc-page',
        status: 'captured',
        accessedAt: '2026-04-10T00:00:00.000Z',
        language: 'en',
        region: 'global',
        summary: 'Smoke capture completed'
      },
      collectionLogs: [
        {
          id: 'log_001',
          topicRunId: 'topic_001',
          captureId: 'capture_001',
          step: 'capture',
          status: 'success',
          message: 'Captured YouTube smoke capture via yt-dlp',
          createdAt: '2026-04-10T00:00:00.000Z'
        }
      ]
    }));

    const result = await runCrawlerExecutionSmoke({
      route: 'youtube',
      repoRoot: process.cwd(),
      secretRoot: 'C:/secrets',
      outputPath: undefined,
      resolveRuntime,
      createDispatcher: () => ({ run })
    });

    expect(resolveRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
      })
    );
    expect(run).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      status: 'success',
      route: 'youtube',
      runtime: {
        routeKey: 'youtube',
        driver: 'yt-dlp'
      }
    });
  });
});
```

- [ ] **Step 2: Run the harness test to verify it fails**

Run: `pnpm exec vitest run tests/integration/crawler-execution-smoke.test.ts`

Expected: FAIL because `crawler-execution/smoke.ts` and the CLI script do not exist yet.

- [ ] **Step 3: Implement the smoke harness core**

```ts
// services/control-api/src/collection/crawler-execution/smoke.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { CapturePlan } from '../capture-runner.js';
import { createId } from '@openfons/shared';
import { createCrawlerExecutionDispatcher } from './dispatcher.js';
import { resolveExecutableCrawlerRouteForUrl } from './runtime.js';
import { createTikTokApiRunner } from './tiktok-api-runner.js';
import { createYtDlpRunner } from './yt-dlp-runner.js';

export type SmokeRoute = 'youtube' | 'tiktok';

const DEFAULT_TARGETS = {
  youtube: {
    title: 'YouTube smoke capture',
    url:
      process.env.OPENFONS_SMOKE_YOUTUBE_URL ??
      'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    sourceKind: 'official' as const,
    useAs: 'primary' as const,
    reportability: 'reportable' as const,
    riskLevel: 'low' as const,
    captureType: 'doc-page' as const,
    language: 'en',
    region: 'global'
  },
  tiktok: {
    title: 'TikTok smoke capture',
    url:
      process.env.OPENFONS_SMOKE_TIKTOK_URL ??
      'https://www.tiktok.com/@scout2015',
    sourceKind: 'official' as const,
    useAs: 'primary' as const,
    reportability: 'reportable' as const,
    riskLevel: 'low' as const,
    captureType: 'doc-page' as const,
    language: 'en',
    region: 'global'
  }
} satisfies Record<
  SmokeRoute,
  Omit<CapturePlan, 'topicRunId' | 'snippet'>
>;

export const runCrawlerExecutionSmoke = async ({
  route,
  repoRoot = process.cwd(),
  secretRoot = process.env.OPENFONS_SECRET_ROOT,
  outputPath,
  resolveRuntime = resolveExecutableCrawlerRouteForUrl,
  createDispatcher = () =>
    createCrawlerExecutionDispatcher({
      ytDlpRunner: createYtDlpRunner(),
      tiktokApiRunner: createTikTokApiRunner({ repoRoot })
    })
}: {
  route: SmokeRoute;
  repoRoot?: string;
  secretRoot?: string;
  outputPath?: string;
  resolveRuntime?: typeof resolveExecutableCrawlerRouteForUrl;
  createDispatcher?: typeof createCrawlerExecutionDispatcher;
}) => {
  if (!secretRoot) {
    throw new Error('OPENFONS_SECRET_ROOT is required for crawler smoke validation');
  }

  const target = DEFAULT_TARGETS[route];
  const runtime = resolveRuntime({
    projectId: 'openfons',
    repoRoot,
    secretRoot,
    url: target.url
  });

  if (!runtime) {
    throw new Error(`no executable crawler runtime resolved for ${route} (${target.url})`);
  }
  if (runtime.routeKey !== route) {
    throw new Error(
      `resolved route mismatch: expected ${route}, got ${runtime.routeKey}`
    );
  }

  const dispatcher = createDispatcher();
  let payload:
    | {
        status: 'success';
        route: SmokeRoute;
        runtime: {
          routeKey: string;
          driver: string;
          mode: string;
        };
        sourceCapture: unknown;
        collectionLogs: unknown[];
      }
    | {
        status: 'error';
        route: SmokeRoute;
        runtime: {
          routeKey: string;
          driver: string;
          mode: string;
        };
        error: string;
      };

  try {
    const result = await dispatcher.run({
      capturePlan: {
        topicRunId: createId('topic'),
        title: target.title,
        url: target.url,
        snippet: `${route} smoke validation`,
        sourceKind: target.sourceKind,
        useAs: target.useAs,
        reportability: target.reportability,
        riskLevel: target.riskLevel,
        captureType: target.captureType,
        language: target.language,
        region: target.region
      },
      runtime
    });

    payload = {
      status: 'success',
      route,
      runtime: {
        routeKey: runtime.routeKey,
        driver: runtime.collection.driver,
        mode: runtime.mode
      },
      sourceCapture: result.sourceCapture,
      collectionLogs: result.collectionLogs
    };
  } catch (error) {
    payload = {
      status: 'error',
      route,
      runtime: {
        routeKey: runtime.routeKey,
        driver: runtime.collection.driver,
        mode: runtime.mode
      },
      error: error instanceof Error ? error.message : String(error)
    };
  }

  if (outputPath) {
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  }

  return payload;
};
```

- [ ] **Step 4: Add the CLI entrypoint and package script**

```ts
// scripts/workbench/smoke-crawler-execution.ts
import path from 'node:path';
import { runCrawlerExecutionSmoke, type SmokeRoute } from '../../services/control-api/src/collection/crawler-execution/smoke.js';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const routeIndex = args.indexOf('--route');
  const outIndex = args.indexOf('--out');

  const route = args[routeIndex + 1] as SmokeRoute | undefined;
  const outputPath =
    outIndex >= 0 ? path.resolve(process.cwd(), args[outIndex + 1]) : undefined;

  if (route !== 'youtube' && route !== 'tiktok') {
    throw new Error('usage: --route youtube|tiktok [--out relative/path.json]');
  }

  return { route, outputPath };
};

const main = async () => {
  const { route, outputPath } = parseArgs();
  const result = await runCrawlerExecutionSmoke({ route, outputPath });
  console.log(JSON.stringify(result, null, 2));
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

```json
// package.json
{
  "scripts": {
    "smoke:crawler-execution": "tsx scripts/workbench/smoke-crawler-execution.ts"
  }
}
```

- [ ] **Step 5: Re-run the harness test**

Run: `pnpm exec vitest run tests/integration/crawler-execution-smoke.test.ts`

Expected: PASS

- [ ] **Step 6: Run typecheck for the new harness path**

Run:

`pnpm exec tsc -p services/control-api/tsconfig.json --noEmit`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package.json \
  services/control-api/src/collection/crawler-execution/smoke.ts \
  scripts/workbench/smoke-crawler-execution.ts \
  tests/integration/crawler-execution-smoke.test.ts
git commit -m "feat(smoke): add crawler execution harness"
```

### Task 2: Add the operator runbook

**Files:**
- Create: `docs/superpowers/2026-04-10-crawler-execution-smoke-runbook.md`

- [ ] **Step 1: Write the runbook with exact Windows-first prerequisite commands**

````md
# Crawler Execution Smoke Runbook

## Preconditions

```powershell
uv --version
Get-Command yt-dlp -ErrorAction Stop
if (-not (Test-Path .\.env_uv\Scripts\python.exe)) {
  uv venv .env_uv
}
uv sync --python .\.env_uv\Scripts\python.exe
```

## Secret Layout

`$env:OPENFONS_SECRET_ROOT\project\openfons\pinchtab-token`

`$env:OPENFONS_SECRET_ROOT\project\openfons\tiktok-account-main.json`

`$env:OPENFONS_SECRET_ROOT\project\openfons\tiktok-cookie-main`

`$env:OPENFONS_SECRET_ROOT\project\openfons\global-proxy-pool.json`

## Environment Setup

```powershell
$env:OPENFONS_SECRET_ROOT = "$HOME\.openfons\secrets"
$env:OPENFONS_SMOKE_YOUTUBE_URL = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"
$env:OPENFONS_SMOKE_TIKTOK_URL = "https://www.tiktok.com/@scout2015"
```

## YouTube Smoke

```powershell
pnpm exec tsx scripts/workbench/smoke-crawler-execution.ts `
  --route youtube `
  --out docs/workbench/generated/crawler-execution-smoke-youtube.json
Get-Content docs/workbench/generated/crawler-execution-smoke-youtube.json
```

Success signal: JSON contains `"status": "success"` and `"driver": "yt-dlp"`.

## TikTok Smoke

```powershell
pnpm exec tsx scripts/workbench/smoke-crawler-execution.ts `
  --route tiktok `
  --out docs/workbench/generated/crawler-execution-smoke-tiktok.json
Get-Content docs/workbench/generated/crawler-execution-smoke-tiktok.json
```

Success signal: JSON contains `"status": "success"` and `"driver": "tiktok-api"`.

## Failure Triage

- Missing `yt-dlp`: install or set `OPENFONS_YT_DLP_PATH`
- Missing `.env_uv` python: run `uv venv .env_uv` and `uv sync --python .\.env_uv\Scripts\python.exe`
- Missing `uv`: install `uv` or set `OPENFONS_UV_PATH`
- Missing account/cookie/proxy secret: repair files under `$env:OPENFONS_SECRET_ROOT\project\openfons\`
- TikTok session expired: replace cookie file with a fresh `ms_token`
````

- [ ] **Step 2: Self-review the runbook against actual code paths**

Checklist:

1. `.env_uv` path matches `services/control-api/src/collection/crawler-execution/tiktok-api-runner.ts`
2. `yt-dlp` host command behavior matches `services/control-api/src/collection/crawler-execution/tooling.ts`
3. secret filenames match `config/projects/openfons/plugins/bindings.json`
4. both smoke commands point at the new CLI entrypoint from Task 1

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/2026-04-10-crawler-execution-smoke-runbook.md
git commit -m "docs(smoke): add crawler execution runbook"
```

### Task 3: Execute and record the YouTube smoke run

**Files:**
- Create/Modify: `docs/workbench/generated/crawler-execution-smoke-youtube.json`
- Modify: `docs/superpowers/2026-04-10-crawler-execution-smoke-runbook.md`

- [ ] **Step 1: Run the preflight commands from the runbook**

Run:

```powershell
uv --version
Get-Command yt-dlp -ErrorAction Stop
Test-Path .\.env_uv\Scripts\python.exe
Test-Path "$env:OPENFONS_SECRET_ROOT\project\openfons\global-proxy-pool.json"
```

Expected: all commands succeed or produce `True` for required paths.

- [ ] **Step 2: Execute the YouTube smoke command**

Run:

```powershell
pnpm exec tsx scripts/workbench/smoke-crawler-execution.ts `
  --route youtube `
  --out docs/workbench/generated/crawler-execution-smoke-youtube.json
```

Expected: JSON is printed to stdout and written to `docs/workbench/generated/crawler-execution-smoke-youtube.json`.

- [ ] **Step 3: Review the artifact and update the runbook status table**

Run:

```powershell
Get-Content docs/workbench/generated/crawler-execution-smoke-youtube.json
```

Then append a short outcome block to the runbook:

```md
## Latest Recorded Result

### YouTube

- Date: 2026-04-10
- Status: success
- Driver: yt-dlp
- Capture summary: copy the exact `sourceCapture.summary` value from the JSON artifact
- Blockers: none
```

If the run fails, keep the same block but replace `Status` with `error` and paste the exact error string under `Blockers`.

- [ ] **Step 4: Commit**

```bash
git add docs/workbench/generated/crawler-execution-smoke-youtube.json \
  docs/superpowers/2026-04-10-crawler-execution-smoke-runbook.md
git commit -m "docs(smoke): record youtube crawler validation"
```

### Task 4: Execute and record the TikTok smoke run

**Files:**
- Create/Modify: `docs/workbench/generated/crawler-execution-smoke-tiktok.json`
- Modify: `docs/superpowers/2026-04-10-crawler-execution-smoke-runbook.md`

- [ ] **Step 1: Verify TikTok-specific prerequisites before execution**

Run:

```powershell
Test-Path "$env:OPENFONS_SECRET_ROOT\project\openfons\tiktok-account-main.json"
Test-Path "$env:OPENFONS_SECRET_ROOT\project\openfons\tiktok-cookie-main"
Select-String -Path "$env:OPENFONS_SECRET_ROOT\project\openfons\tiktok-cookie-main" -Pattern "ms_token|msToken"
```

Expected: files exist and `Select-String` finds `ms_token` or `msToken` without printing the whole cookie blob into the terminal transcript.

- [ ] **Step 2: Execute the TikTok smoke command**

Run:

```powershell
pnpm exec tsx scripts/workbench/smoke-crawler-execution.ts `
  --route tiktok `
  --out docs/workbench/generated/crawler-execution-smoke-tiktok.json
```

Expected: JSON is printed to stdout and written to `docs/workbench/generated/crawler-execution-smoke-tiktok.json`.

- [ ] **Step 3: Review the artifact and update the runbook status table**

Run:

```powershell
Get-Content docs/workbench/generated/crawler-execution-smoke-tiktok.json
```

Then append:

```md
### TikTok

- Date: 2026-04-10
- Status: success
- Driver: tiktok-api
- Capture summary: copy the exact `sourceCapture.summary` value from the JSON artifact
- Blockers: none
```

If the run fails, keep `Status: error` and paste the precise failure into `Blockers` instead of rephrasing it.

- [ ] **Step 4: Commit**

```bash
git add docs/workbench/generated/crawler-execution-smoke-tiktok.json \
  docs/superpowers/2026-04-10-crawler-execution-smoke-runbook.md
git commit -m "docs(smoke): record tiktok crawler validation"
```

### Task 5: Update Memory and choose the next mainline

**Files:**
- Modify: `Memory/02_todos/todo_v007_001_20260410.md`
- Modify: the current session's timestamped file under `Memory/03_chat_logs/`

- [ ] **Step 1: Mark the completed v007 milestones**

Update `todo_v007_001_20260410.md` so these items reflect reality:

```md
- [x] 产出 `crawler execution smoke validation` 计划文档
- [x] 产出面向操作者的运行 runbook / 检查清单
- [x] 执行 `youtube` 最小 smoke 验证并记录结果
- [x] 执行 `tiktok` 最小 smoke 验证并记录结果
```

If one or both smoke runs fail, keep the corresponding checkbox unchecked and add the exact blocker under `待完成`.

- [ ] **Step 2: Append the decision log**

Append a chat-log summary like:

```md
# 2026-04-10 18:30 会话记录

---
时间: 2026-04-10 18:30
用户: 同意执行 `crawler execution` 真实环境 smoke 验证。
助手: 已完成 smoke harness、operator runbook 与 `youtube / tiktok` 实机验证。逐条记录已验证前提、每条路线的成功/失败状态、以及基于结果给出的下一步建议；如果失败，保留原始错误语义，不要改写成空泛总结。
```

- [ ] **Step 3: Decide the next mainline from evidence, not optimism**

Use this rule:

1. both routes succeed: next mainline can expand `twscrape / PRAW / MediaCrawler`
2. `youtube` succeeds but `tiktok` fails on auth/session friction: next mainline should harden TikTok runtime ergonomics
3. both fail on environment setup or secret material: next mainline should focus on operator tooling and runtime diagnostics, not new adapters

- [ ] **Step 4: Commit**

```bash
git add Memory/02_todos/todo_v007_001_20260410.md Memory/03_chat_logs
git commit -m "memorytree(v007): record crawler smoke results"
```

## Self-Review

### Goal coverage

Covered:

1. real host/runtime prerequisite inventory: Task 2
2. repeatable route-level smoke harness: Task 1
3. operator runbook with exact commands and secret layout: Task 2
4. separate `youtube` and `tiktok` smoke artifacts: Task 3 and Task 4
5. evidence-based next-goal decision: Task 5

### Placeholder scan

The plan avoids `TODO`/`TBD` placeholders in code and command steps. The only variable elements are real smoke outcomes, and the plan explicitly says how to record success vs failure without replacing exact error strings.

### Type and path consistency

The plan consistently uses:

1. `services/control-api/src/collection/crawler-execution/smoke.ts` for the reusable harness
2. `scripts/workbench/smoke-crawler-execution.ts` for the CLI entrypoint
3. `docs/superpowers/2026-04-10-crawler-execution-smoke-runbook.md` for operator guidance
4. `docs/workbench/generated/crawler-execution-smoke-youtube.json` and `docs/workbench/generated/crawler-execution-smoke-tiktok.json` for committed evidence artifacts

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-10-crawler-execution-smoke-validation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
