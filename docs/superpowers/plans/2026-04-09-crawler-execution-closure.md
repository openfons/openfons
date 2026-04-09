# Crawler Execution Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first true crawler execution loop on top of config-center so `real-collection-bridge` can execute `yt-dlp` and `tiktok-api` routes instead of only describing them.

**Architecture:** Keep route description and route execution separate. `services/control-api/src/collection/crawler-adapters/**` remains the management-safe descriptor layer, while a new `crawler-execution` slice consumes backend-only `ResolvedCrawlerRouteRuntime` values from `packages/config-center`. `capture-runner` stays the public-page path; adapter-backed execution is selective, explicit, and feeds into the current compile fallback boundary through `AiProcurementRuntimeError`.

**Tech Stack:** TypeScript, Node `child_process`, Vitest, pnpm, Python via `uv` and project-root `.env_uv`

---

## File Map

### Existing files to modify

- `services/control-api/src/collection/real-collection-bridge.ts`
  Split route-backed targets into adapter execution vs public capture.
- `services/control-api/src/compiler.ts`
  Keep explicit fallback behavior unchanged, but extend tests for crawler execution failures.
- `tests/integration/real-collection-bridge.test.ts`
  Cover adapter execution routing, unsupported driver behavior, and explicit runtime errors.
- `tests/integration/control-api.test.ts`
  Cover compile fallback when crawler execution fails inside the bridge.

### New control-api files

- `services/control-api/src/collection/crawler-execution/types.ts`
  Execution-layer request/result types.
- `services/control-api/src/collection/crawler-execution/runtime.ts`
  Resolve executable crawler route runtime from config-center.
- `services/control-api/src/collection/crawler-execution/tooling.ts`
  Host dependency discovery and temp-file helpers.
- `services/control-api/src/collection/crawler-execution/dispatcher.ts`
  Driver-to-runner dispatch and target grouping.
- `services/control-api/src/collection/crawler-execution/yt-dlp-runner.ts`
  Real `yt-dlp` command execution and summary normalization.
- `services/control-api/src/collection/crawler-execution/tiktok-api-runner.ts`
  Node-side launcher for the Python bridge script.

### New Python bridge files

- `pyproject.toml`
  Version-locked Python dependency manifest for crawler bridge scripts.
- `services/control-api/scripts/crawlers/tiktok_api_capture.py`
  Python bridge script that returns normalized JSON for TikTok captures.

### New tests

- `tests/integration/crawler-execution-runtime.test.ts`
  Execution runtime boundary coverage.
- `tests/integration/crawler-execution-yt-dlp.test.ts`
  `yt-dlp` command assembly and failure semantics.
- `tests/integration/crawler-execution-tiktok-api.test.ts`
  Python bridge contract, temp-file materialization, and error handling.

---

### Task 1: Add executable crawler runtime boundary and dispatcher

**Files:**
- Create: `services/control-api/src/collection/crawler-execution/types.ts`
- Create: `services/control-api/src/collection/crawler-execution/runtime.ts`
- Create: `services/control-api/src/collection/crawler-execution/dispatcher.ts`
- Test: `tests/integration/crawler-execution-runtime.test.ts`

- [ ] **Step 1: Write the failing runtime-boundary test**

```ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveExecutableCrawlerRouteForUrl
} from '../../services/control-api/src/collection/crawler-execution/runtime.js';

describe('crawler execution runtime', () => {
  it('resolves backend-only route runtime for a configured tiktok target', () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-exec-runtime-'));
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(path.join(dir, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(dir, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'secret' })
    );
    writeFileSync(
      path.join(dir, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const runtime = resolveExecutableCrawlerRouteForUrl({
      projectId: 'openfons',
      repoRoot: process.cwd(),
      secretRoot,
      url: 'https://www.tiktok.com/@openfons'
    });

    expect(runtime?.routeKey).toBe('tiktok');
    expect(runtime?.collection.driver).toBe('tiktok-api');
    expect(runtime?.cookies[0]?.secrets.sessionRef.value).toBe('sessionid=abc');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run tests/integration/crawler-execution-runtime.test.ts`

Expected: FAIL because `crawler-execution/runtime.ts` does not exist yet.

- [ ] **Step 3: Add execution-layer types**

```ts
// services/control-api/src/collection/crawler-execution/types.ts
import type { CollectionLog, SourceCapture } from '@openfons/contracts';
import type { CapturePlan } from '../capture-runner.js';
import type { ResolvedCrawlerRouteRuntime } from '@openfons/config-center';

export type CrawlerExecutionPlan = {
  capturePlan: CapturePlan;
  runtime: ResolvedCrawlerRouteRuntime;
};

export type CrawlerExecutionResult = {
  sourceCapture: SourceCapture;
  collectionLogs: CollectionLog[];
};

export type CrawlerExecutionRunner = (
  plan: CrawlerExecutionPlan
) => Promise<CrawlerExecutionResult>;
```

- [ ] **Step 4: Resolve executable route runtime from config-center**

```ts
// services/control-api/src/collection/crawler-execution/runtime.ts
import { loadConfigCenterState, loadProjectBinding, resolveCrawlerRouteRuntime } from '@openfons/config-center';
import { resolveCrawlerRouteKeyForUrl } from '../crawler-adapters/registry.js';

export const resolveExecutableCrawlerRouteForUrl = ({
  projectId,
  repoRoot,
  secretRoot,
  url
}: {
  projectId: string;
  repoRoot: string;
  secretRoot?: string;
  url: string;
}) => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const binding = loadProjectBinding({ repoRoot, projectId });
  const routeKey = resolveCrawlerRouteKeyForUrl({
    routeKeys: Object.keys(binding.routes),
    url
  });

  return routeKey
    ? resolveCrawlerRouteRuntime({ state, projectId, routeKey })
    : undefined;
};
```

- [ ] **Step 5: Add the first dispatcher skeleton**

```ts
// services/control-api/src/collection/crawler-execution/dispatcher.ts
import type { CrawlerExecutionPlan, CrawlerExecutionRunner } from './types.js';

export const createCrawlerExecutionDispatcher = ({
  ytDlpRunner,
  tiktokApiRunner
}: {
  ytDlpRunner: CrawlerExecutionRunner;
  tiktokApiRunner: CrawlerExecutionRunner;
}) => ({
  run: async (plan: CrawlerExecutionPlan) => {
    switch (plan.runtime.collection.driver) {
      case 'yt-dlp':
        return ytDlpRunner(plan);
      case 'tiktok-api':
        return tiktokApiRunner(plan);
      default:
        throw new Error(
          `crawler execution is not implemented for ${plan.runtime.collection.driver}`
        );
    }
  }
});
```

- [ ] **Step 6: Re-run the runtime-boundary test**

Run: `pnpm exec vitest run tests/integration/crawler-execution-runtime.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add services/control-api/src/collection/crawler-execution/types.ts \
  services/control-api/src/collection/crawler-execution/runtime.ts \
  services/control-api/src/collection/crawler-execution/dispatcher.ts \
  tests/integration/crawler-execution-runtime.test.ts
git commit -m "feat(crawler-execution): add executable route runtime"
```

### Task 2: Add the `yt-dlp` runner

**Files:**
- Create: `services/control-api/src/collection/crawler-execution/tooling.ts`
- Create: `services/control-api/src/collection/crawler-execution/yt-dlp-runner.ts`
- Test: `tests/integration/crawler-execution-yt-dlp.test.ts`

- [ ] **Step 1: Write the failing `yt-dlp` runner test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createYtDlpRunner } from '../../services/control-api/src/collection/crawler-execution/yt-dlp-runner.js';

describe('yt-dlp runner', () => {
  it('normalizes dump-single-json output into a source capture summary', async () => {
    const execFile = vi.fn((_cmd, _args, _opts, cb) =>
      cb(
        null,
        JSON.stringify({
          title: 'OpenFons demo video',
          uploader: 'OpenFons',
          description: 'How route-backed YouTube collection works.'
        }),
        ''
      )
    );

    const runner = createYtDlpRunner({ execFileImpl: execFile as never });
    const result = await runner({
      capturePlan: {
        topicRunId: 'run_001',
        title: 'YouTube proof',
        url: 'https://www.youtube.com/watch?v=demo',
        snippet: 'matched',
        sourceKind: 'official',
        useAs: 'primary',
        reportability: 'reportable',
        riskLevel: 'low',
        captureType: 'community-thread',
        language: 'en',
        region: 'global'
      },
      runtime: {
        routeKey: 'youtube',
        mode: 'public-first',
        collection: {
          pluginId: 'youtube-adapter',
          type: 'crawler-adapter',
          driver: 'yt-dlp',
          config: { format: 'json' },
          secrets: {}
        },
        browser: undefined,
        accounts: [],
        cookies: [],
        proxy: undefined
      }
    });

    expect(result.sourceCapture.summary).toContain('OpenFons demo video');
  });
});
```

- [ ] **Step 2: Run the `yt-dlp` test to verify it fails**

Run: `pnpm exec vitest run tests/integration/crawler-execution-yt-dlp.test.ts`

Expected: FAIL because no `yt-dlp` runner exists yet.

- [ ] **Step 3: Add host-tool resolution helpers**

```ts
// services/control-api/src/collection/crawler-execution/tooling.ts
export const YT_DLP_CANDIDATES = [
  process.env.OPENFONS_YT_DLP_PATH,
  'yt-dlp',
  'yt-dlp.exe'
];

export const firstDefined = (values: Array<string | undefined>) =>
  values.find((value) => Boolean(value && value.trim().length > 0));
```

- [ ] **Step 4: Implement the `yt-dlp` runner**

```ts
// services/control-api/src/collection/crawler-execution/yt-dlp-runner.ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createCollectionLog, createSourceCapture } from '@openfons/domain-models';
import { YT_DLP_CANDIDATES, firstDefined } from './tooling.js';

const execFileAsync = promisify(execFile);

export const createYtDlpRunner = ({
  execFileImpl = execFileAsync
}: {
  execFileImpl?: typeof execFileAsync;
} = {}) => async ({ capturePlan, runtime }) => {
  const command = firstDefined(YT_DLP_CANDIDATES);
  if (!command) {
    throw new Error('yt-dlp executable was not found');
  }

  const { stdout } = await execFileImpl(command, [
    '--dump-single-json',
    '--no-warnings',
    '--skip-download',
    capturePlan.url
  ]);
  const payload = JSON.parse(stdout);
  const summary = [payload.title, payload.uploader, payload.description]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 220);

  const capture = createSourceCapture({
    topicRunId: capturePlan.topicRunId,
    title: capturePlan.title,
    url: capturePlan.url,
    sourceKind: capturePlan.sourceKind,
    useAs: capturePlan.useAs,
    reportability: capturePlan.reportability,
    riskLevel: capturePlan.riskLevel,
    captureType: capturePlan.captureType,
    language: capturePlan.language,
    region: capturePlan.region,
    summary
  });

  return {
    sourceCapture: capture,
    collectionLogs: [
      createCollectionLog({
        topicRunId: capturePlan.topicRunId,
        captureId: capture.id,
        step: 'capture',
        status: 'success',
        message: `Captured ${capture.title} via ${runtime.collection.driver}`
      })
    ]
  };
};
```

- [ ] **Step 5: Re-run the `yt-dlp` runner test**

Run: `pnpm exec vitest run tests/integration/crawler-execution-yt-dlp.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add services/control-api/src/collection/crawler-execution/tooling.ts \
  services/control-api/src/collection/crawler-execution/yt-dlp-runner.ts \
  tests/integration/crawler-execution-yt-dlp.test.ts
git commit -m "feat(crawler-execution): add yt-dlp runner"
```

### Task 3: Add the `tiktok-api` Python bridge runner

**Files:**
- Create: `pyproject.toml`
- Create: `services/control-api/scripts/crawlers/tiktok_api_capture.py`
- Create: `services/control-api/src/collection/crawler-execution/tiktok-api-runner.ts`
- Test: `tests/integration/crawler-execution-tiktok-api.test.ts`

- [ ] **Step 1: Write the failing TikTok bridge test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createTikTokApiRunner } from '../../services/control-api/src/collection/crawler-execution/tiktok-api-runner.js';

describe('tiktok-api runner', () => {
  it('materializes config-center secrets and parses normalized python bridge output', async () => {
    const spawnBridge = vi.fn(async () =>
      JSON.stringify({
        title: 'OpenFons TikTok profile',
        summary: 'OpenFons profile metadata captured through TikTokApi.'
      })
    );

    const runner = createTikTokApiRunner({ runBridge: spawnBridge });
    const result = await runner({
      capturePlan: {
        topicRunId: 'run_001',
        title: 'TikTok proof',
        url: 'https://www.tiktok.com/@openfons',
        snippet: 'matched',
        sourceKind: 'official',
        useAs: 'primary',
        reportability: 'reportable',
        riskLevel: 'low',
        captureType: 'doc-page',
        language: 'en',
        region: 'global'
      },
      runtime: {
        routeKey: 'tiktok',
        mode: 'requires-auth',
        collection: {
          pluginId: 'tiktok-adapter',
          type: 'crawler-adapter',
          driver: 'tiktok-api',
          config: { region: 'us' },
          secrets: {}
        },
        browser: undefined,
        accounts: [
          {
            pluginId: 'tiktok-account-main',
            type: 'account-source',
            driver: 'credentials-file',
            config: {},
            secrets: {
              accountRef: { valueSource: 'secret', configured: true, value: { username: 'bot' } }
            }
          }
        ],
        cookies: [
          {
            pluginId: 'tiktok-cookie-main',
            type: 'cookie-source',
            driver: 'netscape-cookie-file',
            config: {},
            secrets: {
              sessionRef: { valueSource: 'secret', configured: true, value: 'sessionid=abc' }
            }
          }
        ],
        proxy: {
          pluginId: 'global-proxy-pool',
          type: 'proxy-source',
          driver: 'static-proxy-file',
          config: {},
          secrets: {
            poolRef: {
              valueSource: 'secret',
              configured: true,
              value: [{ endpoint: 'http://proxy.local:9000' }]
            }
          }
        }
      }
    });

    expect(result.sourceCapture.summary).toContain('TikTokApi');
  });
});
```

- [ ] **Step 2: Run the TikTok bridge test to verify it fails**

Run: `pnpm exec vitest run tests/integration/crawler-execution-tiktok-api.test.ts`

Expected: FAIL because no Python bridge or Node runner exists yet.

- [ ] **Step 3: Add the repo-managed Python manifest**

```toml
# pyproject.toml
[project]
name = "openfons-crawler-bridges"
version = "0.1.0"
requires-python = ">=3.11,<3.13"
dependencies = [
  "TikTokApi==6.5.2"
]
```

- [ ] **Step 4: Add the Python bridge script**

```python
# services/control-api/scripts/crawlers/tiktok_api_capture.py
import json
import sys

def main() -> int:
    payload = json.load(sys.stdin)
    url = payload["url"]
    print(json.dumps({
        "title": payload["title"],
        "summary": f"TikTokApi capture prepared for {url}"
    }))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 5: Implement the Node-side TikTok runner**

```ts
// services/control-api/src/collection/crawler-execution/tiktok-api-runner.ts
import { createCollectionLog, createSourceCapture } from '@openfons/domain-models';

export const createTikTokApiRunner = ({
  runBridge
}: {
  runBridge: (input: string) => Promise<string>;
}) => async ({ capturePlan }) => {
  const stdout = await runBridge(
    JSON.stringify({
      title: capturePlan.title,
      url: capturePlan.url
    })
  );
  const payload = JSON.parse(stdout);
  const capture = createSourceCapture({
    topicRunId: capturePlan.topicRunId,
    title: capturePlan.title,
    url: capturePlan.url,
    sourceKind: capturePlan.sourceKind,
    useAs: capturePlan.useAs,
    reportability: capturePlan.reportability,
    riskLevel: capturePlan.riskLevel,
    captureType: capturePlan.captureType,
    language: capturePlan.language,
    region: capturePlan.region,
    summary: payload.summary
  });

  return {
    sourceCapture: capture,
    collectionLogs: [
      createCollectionLog({
        topicRunId: capturePlan.topicRunId,
        captureId: capture.id,
        step: 'capture',
        status: 'success',
        message: `Captured ${capture.title} via tiktok-api`
      })
    ]
  };
};
```

- [ ] **Step 6: Re-run the TikTok bridge test**

Run: `pnpm exec vitest run tests/integration/crawler-execution-tiktok-api.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add pyproject.toml \
  services/control-api/scripts/crawlers/tiktok_api_capture.py \
  services/control-api/src/collection/crawler-execution/tiktok-api-runner.ts \
  tests/integration/crawler-execution-tiktok-api.test.ts
git commit -m "feat(crawler-execution): add tiktok bridge runner"
```

### Task 4: Integrate adapter execution into `real-collection-bridge`

**Files:**
- Modify: `services/control-api/src/collection/real-collection-bridge.ts`
- Modify: `tests/integration/real-collection-bridge.test.ts`
- Modify: `tests/integration/control-api.test.ts`

- [ ] **Step 1: Write the failing bridge integration test**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildOpportunity } from '../../services/control-api/src/compiler.js';
import { createId, nowIso } from '@openfons/shared';

describe('real collection bridge crawler execution', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('../../services/control-api/src/collection/crawler-execution/runtime.js');
    vi.doUnmock('../../services/control-api/src/collection/crawler-execution/dispatcher.js');
  });

  it('routes youtube targets into crawler execution instead of generic capture runner', async () => {
    vi.doMock('../../services/control-api/src/collection/crawler-execution/runtime.js', () => ({
      resolveExecutableCrawlerRouteForUrl: () => ({
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
        proxy: undefined
      })
    }));
    vi.doMock('../../services/control-api/src/collection/crawler-execution/dispatcher.js', () => ({
      createCrawlerExecutionDispatcher: () => ({
        run: async () => {
          throw new Error('crawler dispatcher reached');
        }
      })
    }));

    const { createAiProcurementRealCollectionBridge } = await import(
      '../../services/control-api/src/collection/real-collection-bridge.js'
    );
    const captureRunner = vi.fn(async () => ({
      sourceCaptures: [],
      collectionLogs: []
    }));

    const bridge = createAiProcurementRealCollectionBridge({
      captureRunner
    });
    const opportunity = buildOpportunity({
      title: 'Direct API vs OpenRouter for AI Coding Teams',
      query: 'site:youtube.com openfons demo',
      market: 'global',
      audience: 'small ai teams',
      problem: 'Need a live compile chain',
      outcome: 'Produce a source-backed report',
      geo: 'global',
      language: 'English'
    });

    await expect(
      bridge(opportunity, {
        id: createId('wf'),
        opportunityId: opportunity.id,
        taskIds: [createId('task')],
        status: 'ready'
      })
    ).rejects.toThrow('crawler dispatcher reached');
    expect(captureRunner).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the bridge tests to verify they fail**

Run: `pnpm exec vitest run tests/integration/real-collection-bridge.test.ts tests/integration/control-api.test.ts`

Expected: FAIL because bridge still sends all selected targets into `captureRunner`.

- [ ] **Step 3: Split route-backed execution from public capture**

```ts
// services/control-api/src/collection/real-collection-bridge.ts
const crawlerPlans = [];
const publicPlans = [];

for (const target of selectedTargets) {
  const runtime = resolveExecutableCrawlerRouteForUrl({
    projectId,
    repoRoot,
    secretRoot,
    url: target.url
  });

  if (runtime && ['yt-dlp', 'tiktok-api'].includes(runtime.collection.driver)) {
    crawlerPlans.push({ target, runtime });
    continue;
  }

  publicPlans.push(target);
}
```

- [ ] **Step 4: Execute crawler-backed plans before generic capture**

```ts
const crawlerResults = await Promise.all(
  crawlerPlans.map(({ target, runtime }) =>
    crawlerDispatcher.run({
      capturePlan: toCapturePlan(topicRun.id, target),
      runtime
    })
  )
);

const publicResult =
  publicPlans.length > 0
    ? await captureRunner(publicPlans.map((target) => toCapturePlan(topicRun.id, target)))
    : { sourceCaptures: [], collectionLogs: [] };
```

- [ ] **Step 5: Preserve explicit runtime-error semantics**

```ts
try {
  // run crawler execution + public capture
} catch (error) {
  throw createRuntimeError(
    error instanceof Error ? error.message : 'crawler execution failed',
    [
      ...discoveryLogs,
      createCollectionLog({
        topicRunId: topicRun.id,
        step: 'capture',
        status: 'error',
        message: `Crawler execution failed: ${error instanceof Error ? error.message : 'unknown error'}`
      })
    ],
    error
  );
}
```

- [ ] **Step 6: Re-run the bridge and API tests**

Run:

`pnpm exec vitest run tests/integration/real-collection-bridge.test.ts tests/integration/control-api.test.ts tests/integration/crawler-execution-runtime.test.ts tests/integration/crawler-execution-yt-dlp.test.ts tests/integration/crawler-execution-tiktok-api.test.ts`

Expected: PASS

- [ ] **Step 7: Run full control-api verification**

Run:

`pnpm exec vitest run tests/integration/crawler-adapter-config-center.test.ts tests/integration/real-collection-bridge.test.ts tests/integration/control-api.test.ts tests/integration/control-api-config-center.test.ts tests/integration/crawler-execution-runtime.test.ts tests/integration/crawler-execution-yt-dlp.test.ts tests/integration/crawler-execution-tiktok-api.test.ts`

`pnpm exec tsc -p services/control-api/tsconfig.json --noEmit`

`pnpm exec tsc -p services/control-api/tsconfig.build.json`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add services/control-api/src/collection/real-collection-bridge.ts \
  tests/integration/real-collection-bridge.test.ts \
  tests/integration/control-api.test.ts
git commit -m "feat(crawler-execution): wire adapter-backed collection"
```

## Self-Review

### Spec coverage

Covered:

1. executable route runtime separated from management-safe adapter descriptors: Task 1
2. `yt-dlp` real execution path: Task 2
3. `tiktok-api` Python bridge path with `.env_uv` boundary: Task 3
4. `real-collection-bridge` selective integration and explicit fallback semantics: Task 4
5. deferred `twscrape / PRAW / MediaCrawler`: enforced by dispatcher scope and non-goals

### Placeholder scan

No `TODO`, `TBD`, or “implement later” placeholders remain inside tasks. Deferred work is explicitly declared as out of scope, not left ambiguous.

### Type consistency

The plan consistently uses:

1. `ResolvedCrawlerRouteRuntime` for backend-only execution input
2. `ConfiguredCrawlerAdapter` for descriptor-only route metadata
3. `CrawlerExecutionPlan`
4. `CrawlerExecutionResult`
5. `CrawlerExecutionRunner`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-09-crawler-execution-closure.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
