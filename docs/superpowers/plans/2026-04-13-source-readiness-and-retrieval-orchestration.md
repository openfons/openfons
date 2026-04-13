# Source Readiness And Retrieval Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one shared readiness model, wire it into `config-center`, expose it through `control-api`, make `search-gateway` consume it for retrieval orchestration, and attach acquisition metadata to the first evidence consumer path without widening scope into new services or new crawler families.

**Architecture:** Keep the shared contracts in `@openfons/contracts`, keep readiness evaluation in `@openfons/config-center`, make `control-api` the operator-facing read surface, and let `search-gateway` be the first executor that turns readiness into ordered route attempts. Reuse the current `SearchRunResult` response shape by extending it with `retrievalPlan` and `retrievalOutcome`, then let the AI procurement real-collection bridge consume those fields to attach `acquisitionMeta` onto evidence items.

**Tech Stack:** TypeScript, Zod, Hono, Vitest, pnpm workspaces

---

Repository note: this repository forbids creating a dedicated git worktree. Execute this plan in the current workspace and do not add `.tmp/` to version control.

## Planned File Map

### Contracts

- Create: `packages/contracts/src/retrieval-orchestration.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `tests/contract/retrieval-orchestration-schema.test.ts`

### Config Center Core

- Create: `packages/config-center/src/readiness.ts`
- Modify: `packages/config-center/src/index.ts`
- Modify: `packages/config-center/src/runtime/search.ts`
- Test: `tests/integration/config-center-readiness.test.ts`

### Control API Read Surface

- Modify: `services/control-api/src/config-center/service.ts`
- Modify: `services/control-api/src/config-center/router.ts`
- Test: `tests/integration/control-api-config-center-readiness.test.ts`

### Search Gateway Orchestration

- Create: `packages/search-gateway/src/retrieval.ts`
- Modify: `packages/search-gateway/src/gateway.ts`
- Modify: `packages/search-gateway/src/index.ts`
- Test: `tests/integration/search-gateway-retrieval.test.ts`

### Search Gateway Runtime Wiring

- Modify: `services/search-gateway/src/config.ts`
- Test: `tests/integration/search-gateway-runtime-readiness.test.ts`

### Evidence Metadata Consumer

- Modify: `services/control-api/src/collection/real-collection-bridge.ts`
- Test: `tests/integration/real-collection-bridge-acquisition-meta.test.ts`

## Task 1: Add Shared Readiness And Retrieval Contracts

**Files:**
- Create: `packages/contracts/src/retrieval-orchestration.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `tests/contract/retrieval-orchestration-schema.test.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
import { describe, expect, it } from 'vitest';
import {
  EvidenceAcquisitionMetaSchema,
  RetrievalOutcomeSchema,
  RetrievalPlanSchema,
  RouteReadinessSchema,
  SearchRunResultSchema,
  SourceReadinessSchema
} from '@openfons/contracts';

describe('@openfons/contracts retrieval orchestration schemas', () => {
  it('parses readiness, retrieval, and acquisition metadata together', () => {
    const route = RouteReadinessSchema.parse({
      sourceId: 'search',
      routeKey: 'google',
      status: 'ready',
      qualityTier: 'primary',
      requirements: [{ code: 'api-key', message: 'google api key is configured' }],
      blockers: [],
      warnings: [],
      detail: { pluginId: 'google-default' }
    });

    const source = SourceReadinessSchema.parse({
      sourceId: 'search',
      status: 'ready',
      routes: [route],
      summary: 'google is available for search retrieval',
      updatedAt: '2026-04-13T18:40:00.000Z'
    });

    const plan = RetrievalPlanSchema.parse({
      sourceId: 'search',
      planVersion: 'v1',
      generatedAt: '2026-04-13T18:40:00.000Z',
      candidates: [
        {
          routeKey: 'google',
          qualityTier: 'primary',
          status: 'ready',
          priority: 100
        }
      ],
      omissions: []
    });

    const outcome = RetrievalOutcomeSchema.parse({
      sourceId: 'search',
      planVersion: 'v1',
      attempts: [
        {
          sourceId: 'search',
          routeKey: 'google',
          attemptIndex: 0,
          startedAt: '2026-04-13T18:40:00.000Z',
          finishedAt: '2026-04-13T18:40:01.000Z',
          decisionBasis: 'ready-primary',
          result: 'succeeded'
        }
      ],
      selectedRoute: 'google',
      status: 'succeeded',
      omissions: []
    });

    const acquisitionMeta = EvidenceAcquisitionMetaSchema.parse({
      sourceId: 'search',
      routeKey: 'google',
      qualityTier: 'primary',
      routeStatusAtAttempt: 'ready',
      retrievalStatus: 'succeeded',
      attemptedAt: '2026-04-13T18:40:01.000Z',
      decisionReason: 'ready-primary',
      warnings: [],
      blockers: []
    });

    const run = SearchRunResultSchema.parse({
      searchRun: {
        id: 'search_run_001',
        projectId: 'openfons',
        purpose: 'planning',
        query: 'openai pricing official',
        status: 'completed',
        selectedProviders: ['google'],
        degradedProviders: [],
        startedAt: '2026-04-13T18:40:00.000Z',
        finishedAt: '2026-04-13T18:40:01.000Z'
      },
      results: [],
      upgradeCandidates: [],
      diagnostics: [],
      downgradeInfo: [],
      retrievalPlan: plan,
      retrievalOutcome: outcome
    });

    expect(source.routes[0]?.routeKey).toBe('google');
    expect(acquisitionMeta.routeKey).toBe('google');
    expect(run.retrievalOutcome?.selectedRoute).toBe('google');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/contract/retrieval-orchestration-schema.test.ts`

Expected: FAIL with module export errors because `RouteReadinessSchema`, `SourceReadinessSchema`, `RetrievalPlanSchema`, `RetrievalOutcomeSchema`, and `EvidenceAcquisitionMetaSchema` do not exist yet.

- [ ] **Step 3: Write the minimal contract implementation**

Create `packages/contracts/src/retrieval-orchestration.ts`:

```ts
import { z } from 'zod';

export const RouteReadinessStatusSchema = z.enum(['ready', 'degraded', 'blocked']);
export const RouteQualityTierSchema = z.enum([
  'primary',
  'fallback',
  'supplemental'
]);

export const ReadinessNoteSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1)
});

export const RouteReadinessSchema = z.object({
  sourceId: z.string().min(1),
  routeKey: z.string().min(1),
  status: RouteReadinessStatusSchema,
  qualityTier: RouteQualityTierSchema,
  requirements: z.array(ReadinessNoteSchema).default([]),
  blockers: z.array(ReadinessNoteSchema).default([]),
  warnings: z.array(ReadinessNoteSchema).default([]),
  detail: z.record(z.string(), z.unknown()).default({})
});

export const SourceReadinessSchema = z.object({
  sourceId: z.string().min(1),
  status: RouteReadinessStatusSchema,
  routes: z.array(RouteReadinessSchema).min(1),
  summary: z.string().min(1),
  updatedAt: z.string().datetime()
});

export const ProjectReadinessReportSchema = z.object({
  projectId: z.string().min(1),
  sources: z.array(SourceReadinessSchema).min(1)
});

export const RetrievalCandidateSchema = z.object({
  routeKey: z.string().min(1),
  qualityTier: RouteQualityTierSchema,
  status: RouteReadinessStatusSchema,
  priority: z.number().int(),
  penaltyReason: z.string().min(1).optional()
});

export const RetrievalOmissionSchema = z.object({
  routeKey: z.string().min(1),
  status: RouteReadinessStatusSchema,
  reason: z.string().min(1)
});

export const RetrievalPlanSchema = z.object({
  sourceId: z.string().min(1),
  planVersion: z.string().min(1),
  generatedAt: z.string().datetime(),
  candidates: z.array(RetrievalCandidateSchema),
  omissions: z.array(RetrievalOmissionSchema)
});

export const RetrievalAttemptSchema = z.object({
  sourceId: z.string().min(1),
  routeKey: z.string().min(1),
  attemptIndex: z.number().int().nonnegative(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  decisionBasis: z.string().min(1),
  result: z.enum(['succeeded', 'failed', 'blocked', 'skipped'])
});

export const RetrievalOutcomeSchema = z.object({
  sourceId: z.string().min(1),
  planVersion: z.string().min(1),
  attempts: z.array(RetrievalAttemptSchema),
  selectedRoute: z.string().min(1).optional(),
  status: z.enum(['succeeded', 'partial', 'failed', 'blocked']),
  omissions: z.array(RetrievalOmissionSchema)
});

export const EvidenceAcquisitionMetaSchema = z.object({
  sourceId: z.string().min(1),
  routeKey: z.string().min(1),
  qualityTier: RouteQualityTierSchema,
  routeStatusAtAttempt: RouteReadinessStatusSchema,
  retrievalStatus: z.enum(['succeeded', 'failed', 'blocked', 'skipped']),
  attemptedAt: z.string().datetime(),
  decisionReason: z.string().min(1),
  warnings: z.array(ReadinessNoteSchema).default([]),
  blockers: z.array(ReadinessNoteSchema).default([])
});

export type RouteReadiness = z.infer<typeof RouteReadinessSchema>;
export type SourceReadiness = z.infer<typeof SourceReadinessSchema>;
export type ProjectReadinessReport = z.infer<typeof ProjectReadinessReportSchema>;
export type RetrievalPlan = z.infer<typeof RetrievalPlanSchema>;
export type RetrievalAttempt = z.infer<typeof RetrievalAttemptSchema>;
export type RetrievalOutcome = z.infer<typeof RetrievalOutcomeSchema>;
export type EvidenceAcquisitionMeta = z.infer<
  typeof EvidenceAcquisitionMetaSchema
>;
```

Modify `packages/contracts/src/index.ts`:

```ts
export * from './retrieval-orchestration.js';
```

```ts
import {
  EvidenceAcquisitionMetaSchema,
  RetrievalOutcomeSchema,
  RetrievalPlanSchema
} from './retrieval-orchestration.js';
```

```ts
export const EvidenceSchema = z.object({
  id: z.string().min(1),
  topicRunId: z.string().min(1),
  captureId: z.string().min(1),
  kind: EvidenceKindSchema,
  statement: z.string().min(1),
  sourceKind: SourceKindSchema,
  useAs: SourceUseAsSchema,
  reportability: ReportabilitySchema,
  riskLevel: RiskLevelSchema,
  freshnessNote: z.string().min(1),
  supportingCaptureIds: z.array(z.string().min(1)).min(1),
  acquisitionMeta: EvidenceAcquisitionMetaSchema.optional()
});
```

```ts
export const SearchRunResultSchema = z.object({
  searchRun: SearchRunSchema,
  results: z.array(SearchResultSchema),
  upgradeCandidates: z.array(UpgradeCandidateSchema),
  diagnostics: z.array(ProviderDiagnosticSchema),
  downgradeInfo: z.array(DowngradeInfoSchema),
  retrievalPlan: RetrievalPlanSchema.optional(),
  retrievalOutcome: RetrievalOutcomeSchema.optional()
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/contract/retrieval-orchestration-schema.test.ts`

Expected: PASS with 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/retrieval-orchestration.ts packages/contracts/src/index.ts tests/contract/retrieval-orchestration-schema.test.ts
git commit -m "feat(contracts): add retrieval readiness schemas"
```

## Task 2: Implement Config-Center Readiness Evaluation Core

**Files:**
- Create: `packages/config-center/src/readiness.ts`
- Modify: `packages/config-center/src/index.ts`
- Modify: `packages/config-center/src/runtime/search.ts`
- Test: `tests/integration/config-center-readiness.test.ts`

- [ ] **Step 1: Write the failing readiness-core test**

```ts
import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildProjectReadiness } from '@openfons/config-center';

const cloneRepoFixture = () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-readiness-'));
  const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-readiness-secrets-'));
  cpSync(path.join(process.cwd(), 'config'), path.join(repoRoot, 'config'), {
    recursive: true
  });
  const projectDir = path.join(secretRoot, 'project', 'openfons');
  mkdirSync(projectDir, { recursive: true });
  writeFileSync(path.join(projectDir, 'google-api-key'), 'google-key');
  writeFileSync(path.join(projectDir, 'google-cx'), 'google-cx');
  return { repoRoot, secretRoot };
};

describe('@openfons/config-center project readiness', () => {
  it('builds search and crawler readiness from repo config plus local secrets', () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();

    const report = buildProjectReadiness({
      repoRoot,
      secretRoot,
      projectId: 'openfons'
    });

    expect(report.projectId).toBe('openfons');
    expect(report.sources.find((source) => source.sourceId === 'search')).toMatchObject({
      status: 'ready'
    });
    expect(
      report.sources.find((source) => source.sourceId === 'tiktok')?.routes[0]
    ).toMatchObject({
      routeKey: 'tiktok',
      status: 'blocked'
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/config-center-readiness.test.ts`

Expected: FAIL because `buildProjectReadiness` does not exist in `@openfons/config-center`.

- [ ] **Step 3: Implement readiness evaluation**

Create `packages/config-center/src/readiness.ts`:

```ts
import type {
  ProjectBinding,
  ProjectReadinessReport,
  RouteReadiness,
  SourceReadiness
} from '@openfons/contracts';
import { getPluginSpec } from './spec-registry.js';
import { loadConfigCenterState, loadProjectBinding } from './loader.js';
import { validatePluginSelection } from './validator.js';

const toNote = (code: string, message: string) => ({ code, message });

const aggregateSourceStatus = (routes: RouteReadiness[]): SourceReadiness['status'] => {
  if (routes.some((route) => route.status === 'ready')) {
    return 'ready';
  }
  if (routes.some((route) => route.status === 'degraded')) {
    return 'degraded';
  }
  return 'blocked';
};

const asArray = <T>(value: T | T[] | undefined) =>
  !value ? [] : Array.isArray(value) ? value : [value];

const collectSearchPluginIds = (binding: ProjectBinding) => [
  ...new Set([
    ...asArray(binding.roles.primarySearch),
    ...asArray(binding.roles.fallbackSearch),
    ...Object.values(binding.routes).flatMap((route) => route.discovery ?? [])
  ])
];

export const buildProjectReadiness = ({
  repoRoot,
  secretRoot,
  projectId
}: {
  repoRoot: string;
  secretRoot?: string;
  projectId: string;
}): ProjectReadinessReport => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const binding = loadProjectBinding({ repoRoot, projectId });

  const searchRoutes: RouteReadiness[] = collectSearchPluginIds(binding).map((pluginId) => {
    const plugin = state.pluginInstances.find((item) => item.id === pluginId);
    const spec = plugin ? getPluginSpec(plugin.type, plugin.driver) : undefined;
    const validation = validatePluginSelection({ state, pluginIds: [pluginId] });
    const primaryIds = new Set(asArray(binding.roles.primarySearch));
    const fallbackIds = new Set(asArray(binding.roles.fallbackSearch));

    return {
      sourceId: 'search',
      routeKey: plugin?.driver ?? pluginId,
      status:
        validation.errors.length > 0
          ? 'blocked'
          : validation.warnings.length > 0
            ? 'degraded'
            : 'ready',
      qualityTier: primaryIds.has(pluginId)
        ? 'primary'
        : fallbackIds.has(pluginId)
          ? 'fallback'
          : 'supplemental',
      requirements: [
        ...((spec?.requiredConfigFields ?? []).map((field) =>
          toNote(`config:${field}`, `${pluginId} requires config.${field}`)
        )),
        ...((spec?.secretFields ?? []).map((field) =>
          toNote(`secret:${field}`, `${pluginId} requires secret ${field}`)
        ))
      ],
      blockers: validation.errors.map((issue) => toNote(issue.code, issue.message)),
      warnings: validation.warnings.map((issue) => toNote(issue.code, issue.message)),
      detail: { pluginId }
    };
  });

  const crawlerSources: SourceReadiness[] = Object.entries(binding.routes).map(
    ([routeKey, route]) => {
      const pluginIds = [
        ...(route.discovery ?? []),
        ...(route.browser ? [route.browser] : []),
        ...(route.collection ? [route.collection] : []),
        ...(route.accounts ?? []),
        ...(route.cookies ?? []),
        ...(route.proxy ? [route.proxy] : [])
      ];
      const validation = validatePluginSelection({ state, pluginIds });
      const routeReadiness: RouteReadiness = {
        sourceId: routeKey,
        routeKey,
        status:
          validation.errors.length > 0
            ? 'blocked'
            : validation.warnings.length > 0
              ? 'degraded'
              : 'ready',
        qualityTier: 'primary',
        requirements: pluginIds.map((pluginId) =>
          toNote(`plugin:${pluginId}`, `${routeKey} requires plugin ${pluginId}`)
        ),
        blockers: validation.errors.map((issue) => toNote(issue.code, issue.message)),
        warnings: validation.warnings.map((issue) => toNote(issue.code, issue.message)),
        detail: { mode: route.mode }
      };

      return {
        sourceId: routeKey,
        status: aggregateSourceStatus([routeReadiness]),
        routes: [routeReadiness],
        summary: `${routeKey} readiness derived from config-center plugin closure`,
        updatedAt: new Date().toISOString()
      };
    }
  );

  const searchSource: SourceReadiness = {
    sourceId: 'search',
    status: aggregateSourceStatus(searchRoutes),
    routes: searchRoutes,
    summary: 'search readiness derived from configured provider plugins',
    updatedAt: new Date().toISOString()
  };

  return {
    projectId,
    sources: [searchSource, ...crawlerSources]
  };
};
```

Modify `packages/config-center/src/runtime/search.ts`:

```ts
import type { SourceReadiness } from '@openfons/contracts';
import { buildProjectReadiness } from '../readiness.js';

export const resolveSearchSourceReadiness = ({
  state,
  projectId
}: {
  state: ConfigCenterState;
  projectId: string;
}): SourceReadiness => {
  const readiness = buildProjectReadiness({
    repoRoot: state.repoRoot,
    secretRoot: state.secretRoot,
    projectId
  });

  const searchSource = readiness.sources.find((source) => source.sourceId === 'search');

  if (!searchSource) {
    throw new Error(`search readiness not found for ${projectId}`);
  }

  return searchSource;
};
```

Modify `packages/config-center/src/index.ts`:

```ts
export * from './readiness.js';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/config-center-readiness.test.ts`

Expected: PASS with 1 test passed and `tiktok` reported as blocked because its auth-related secrets are absent in the fixture.

- [ ] **Step 5: Commit**

```bash
git add packages/config-center/src/readiness.ts packages/config-center/src/index.ts packages/config-center/src/runtime/search.ts tests/integration/config-center-readiness.test.ts
git commit -m "feat(config-center): add readiness evaluation core"
```

## Task 3: Expose Project Readiness Through Control API

**Files:**
- Modify: `services/control-api/src/config-center/service.ts`
- Modify: `services/control-api/src/config-center/router.ts`
- Test: `tests/integration/control-api-config-center-readiness.test.ts`

- [ ] **Step 1: Write the failing control-api test**

```ts
import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app.js';

const cloneRepoFixture = () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-readiness-http-'));
  const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-readiness-http-secrets-'));
  cpSync(path.join(process.cwd(), 'config'), path.join(repoRoot, 'config'), {
    recursive: true
  });
  const projectDir = path.join(secretRoot, 'project', 'openfons');
  mkdirSync(projectDir, { recursive: true });
  writeFileSync(path.join(projectDir, 'google-api-key'), 'google-key');
  writeFileSync(path.join(projectDir, 'google-cx'), 'google-cx');
  return { repoRoot, secretRoot };
};

describe('control-api config-center readiness route', () => {
  it('returns source readiness with route explanations', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const app = createApp({
      configCenter: { repoRoot, secretRoot }
    });

    const response = await app.request('/api/v1/config/projects/openfons/readiness');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.projectId).toBe('openfons');
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: 'search' }),
        expect.objectContaining({ sourceId: 'tiktok' })
      ])
    );
    expect(body.sources[0].routes[0]).toHaveProperty('requirements');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/control-api-config-center-readiness.test.ts`

Expected: FAIL with `404` because `/api/v1/config/projects/:projectId/readiness` is not routed yet.

- [ ] **Step 3: Implement the read-only readiness endpoint**

Modify `services/control-api/src/config-center/service.ts`:

```ts
import {
  buildProjectReadiness,
  resolveMaskedProjectRuntimeConfig
} from '@openfons/config-center';
import type { ProjectReadinessReport } from '@openfons/contracts';
```

```ts
export type ConfigCenterService = {
  getProjectDoctor: (projectId: string) => ConfigDoctorReport;
  getProjectReadiness: (projectId: string) => ProjectReadinessReport;
  resolveProject: (
    projectId: string
  ) => ReturnType<typeof resolveMaskedProjectRuntimeConfig>;
};
```

```ts
getProjectReadiness: (projectId) =>
  buildProjectReadiness({
    repoRoot,
    secretRoot,
    projectId
  }),
```

Modify `services/control-api/src/config-center/router.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/control-api-config-center-readiness.test.ts`

Expected: PASS with 1 test passed and the response body containing `projectId`, `sources`, and per-route `requirements / blockers / warnings`.

- [ ] **Step 5: Commit**

```bash
git add services/control-api/src/config-center/service.ts services/control-api/src/config-center/router.ts tests/integration/control-api-config-center-readiness.test.ts
git commit -m "feat(control-api): expose project readiness"
```

## Task 4: Add Retrieval Planning And Outcome Tracking To Search Gateway

**Files:**
- Create: `packages/search-gateway/src/retrieval.ts`
- Modify: `packages/search-gateway/src/gateway.ts`
- Modify: `packages/search-gateway/src/index.ts`
- Test: `tests/integration/search-gateway-retrieval.test.ts`

- [ ] **Step 1: Write the failing orchestration test**

```ts
import { describe, expect, it } from 'vitest';
import { createSearchGateway } from '@openfons/search-gateway';

describe('search-gateway retrieval orchestration', () => {
  it('orders ready routes first, keeps degraded routes as penalized fallbacks, and records blocked omissions', async () => {
    const gateway = createSearchGateway({
      projectId: 'openfons',
      providers: {
        google: {
          id: 'google',
          search: async () => [
            {
              title: 'OpenAI API pricing',
              url: 'https://openai.com/api/pricing/',
              snippet: 'Official pricing page',
              rank: 1,
              page: 1
            }
          ]
        },
        bing: {
          id: 'bing',
          search: async () => []
        }
      },
      resolveSourceReadiness: () => ({
        sourceId: 'search',
        status: 'ready',
        summary: 'search routes available',
        updatedAt: '2026-04-13T18:50:00.000Z',
        routes: [
          {
            sourceId: 'search',
            routeKey: 'google',
            status: 'ready',
            qualityTier: 'primary',
            requirements: [],
            blockers: [],
            warnings: [],
            detail: {}
          },
          {
            sourceId: 'search',
            routeKey: 'bing',
            status: 'degraded',
            qualityTier: 'fallback',
            requirements: [],
            blockers: [],
            warnings: [{ code: 'quota', message: 'lower quota' }],
            detail: {}
          },
          {
            sourceId: 'search',
            routeKey: 'ddg',
            status: 'blocked',
            qualityTier: 'supplemental',
            requirements: [],
            blockers: [{ code: 'missing-adapter', message: 'adapter missing' }],
            warnings: [],
            detail: {}
          }
        ]
      })
    });

    const result = await gateway.search({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'openai pricing official',
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    expect(result.retrievalPlan?.candidates.map((candidate) => candidate.routeKey)).toEqual([
      'google',
      'bing'
    ]);
    expect(result.retrievalPlan?.omissions).toEqual([
      expect.objectContaining({ routeKey: 'ddg', status: 'blocked' })
    ]);
    expect(result.retrievalOutcome?.selectedRoute).toBe('google');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/search-gateway-retrieval.test.ts`

Expected: FAIL because `createSearchGateway` does not accept `resolveSourceReadiness` and the response does not contain `retrievalPlan` or `retrievalOutcome`.

- [ ] **Step 3: Implement the orchestration core**

Create `packages/search-gateway/src/retrieval.ts`:

```ts
import { nowIso } from '@openfons/shared';
import type {
  RetrievalAttempt,
  RetrievalOutcome,
  RetrievalPlan,
  SourceReadiness
} from '@openfons/contracts';

export const buildRetrievalPlanFromSourceReadiness = (
  source: SourceReadiness
): RetrievalPlan => {
  const candidates = source.routes
    .filter((route) => route.status !== 'blocked')
    .map((route) => ({
      routeKey: route.routeKey,
      qualityTier: route.qualityTier,
      status: route.status,
      priority:
        route.status === 'ready' && route.qualityTier === 'primary'
          ? 100
          : route.status === 'ready' && route.qualityTier === 'fallback'
            ? 90
            : route.status === 'ready'
              ? 80
              : route.qualityTier === 'primary'
                ? 70
                : route.qualityTier === 'fallback'
                  ? 60
                  : 50,
      penaltyReason:
        route.status === 'degraded'
          ? route.warnings.map((item) => item.message).join('; ')
          : undefined
    }))
    .sort((left, right) => right.priority - left.priority);

  const omissions = source.routes
    .filter((route) => route.status === 'blocked')
    .map((route) => ({
      routeKey: route.routeKey,
      status: route.status,
      reason:
        route.blockers[0]?.message ??
        `${route.routeKey} was blocked before execution`
    }));

  return {
    sourceId: source.sourceId,
    planVersion: 'v1',
    generatedAt: nowIso(),
    candidates,
    omissions
  };
};

export const buildBlockedOutcome = (plan: RetrievalPlan): RetrievalOutcome => ({
  sourceId: plan.sourceId,
  planVersion: plan.planVersion,
  attempts: [],
  status: 'blocked',
  omissions: plan.omissions
});

export const appendAttempt = (
  attempts: RetrievalAttempt[],
  next: RetrievalAttempt
): RetrievalAttempt[] => [...attempts, next];
```

Modify `packages/search-gateway/src/gateway.ts`:

```ts
import type {
  SearchProviderId,
  SearchRequest,
  SearchRunResult,
  SourceReadiness
} from '@openfons/contracts';
import {
  appendAttempt,
  buildBlockedOutcome,
  buildRetrievalPlanFromSourceReadiness
} from './retrieval.js';
```

```ts
  resolveSourceReadiness,
```

```ts
  resolveSourceReadiness?: (input: {
    projectId: string;
    purpose: SearchRequest['purpose'];
  }) => SourceReadiness;
```

```ts
    const sourceReadiness = resolveSourceReadiness
      ? resolveSourceReadiness({
          projectId: effectiveProjectId,
          purpose: request.purpose
        })
      : undefined;

    const retrievalPlan = sourceReadiness
      ? buildRetrievalPlanFromSourceReadiness(sourceReadiness)
      : undefined;

    const routeOrder = retrievalPlan
      ? retrievalPlan.candidates.map((candidate) => candidate.routeKey as SearchProviderId)
      : selectedProviderIds;
```

```ts
    let attempts = [];

    for (const [attemptIndex, providerId] of routeOrder.entries()) {
      const adapter = providers[providerId];
      const attemptStartedAt = nowIso();

      if (!adapter) {
        attempts = appendAttempt(attempts, {
          sourceId: 'search',
          routeKey: providerId,
          attemptIndex,
          startedAt: attemptStartedAt,
          finishedAt: nowIso(),
          decisionBasis: 'missing-adapter',
          result: 'failed'
        });
        continue;
      }

      try {
        for (let page = 1; page <= request.pages; page += 1) {
          const pageResults = await adapter.search({
            query: request.query,
            geo: request.geo,
            language: request.language,
            page,
            maxResults: request.maxResults
          });

          rawResults.push(
            ...pageResults.map((item) => {
              const domain = normalizeDomain(item.url);
              return {
                id: createId('search_result'),
                searchRunId,
                provider: adapter.id,
                title: item.title,
                url: item.url,
                snippet: item.snippet,
                rank: item.rank,
                page: item.page,
                domain,
                sourceKindGuess: guessSourceKind(domain),
                dedupKey: buildDedupKey(item.url),
                selectedForUpgrade: false,
                selectionReason: 'unreviewed'
              };
            })
          );
        }

        diagnostics.push(
          buildDiagnostic({
            providerId: adapter.id,
            status: 'success',
            degraded: false,
            reason: 'ok',
            durationMs: Date.now() - started,
            resultCount: rawResults.filter((item) => item.provider === adapter.id).length
          })
        );
        attempts = appendAttempt(attempts, {
          sourceId: 'search',
          routeKey: providerId,
          attemptIndex,
          startedAt: attemptStartedAt,
          finishedAt: nowIso(),
          decisionBasis: `selected:${providerId}`,
          result: 'succeeded'
        });
      } catch (error) {
        attempts = appendAttempt(attempts, {
          sourceId: 'search',
          routeKey: providerId,
          attemptIndex,
          startedAt: attemptStartedAt,
          finishedAt: nowIso(),
          decisionBasis: error instanceof Error ? error.message : 'unknown-error',
          result: 'failed'
        });
      }
    }
```

```ts
    const retrievalOutcome =
      retrievalPlan && retrievalPlan.candidates.length === 0
        ? buildBlockedOutcome(retrievalPlan)
        : retrievalPlan
          ? {
              sourceId: retrievalPlan.sourceId,
              planVersion: retrievalPlan.planVersion,
              attempts,
              selectedRoute:
                attempts.find((attempt) => attempt.result === 'succeeded')?.routeKey,
              status:
                attempts.some((attempt) => attempt.result === 'succeeded')
                  ? 'succeeded'
                  : attempts.length > 0
                    ? 'failed'
                    : 'blocked',
              omissions: retrievalPlan.omissions
            }
          : undefined;
```

```ts
      retrievalPlan,
      retrievalOutcome
```

Modify `packages/search-gateway/src/index.ts`:

```ts
export * from './retrieval.js';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/search-gateway-retrieval.test.ts`

Expected: PASS with 1 test passed and the response containing `retrievalPlan` and `retrievalOutcome`.

- [ ] **Step 5: Commit**

```bash
git add packages/search-gateway/src/retrieval.ts packages/search-gateway/src/gateway.ts packages/search-gateway/src/index.ts tests/integration/search-gateway-retrieval.test.ts
git commit -m "feat(search-gateway): add retrieval orchestration core"
```

## Task 5: Wire Runtime Search Gateway To Config-Center Readiness

**Files:**
- Modify: `services/search-gateway/src/config.ts`
- Test: `tests/integration/search-gateway-runtime-readiness.test.ts`

- [ ] **Step 1: Write the failing runtime wiring test**

```ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createRuntimeGateway } from '../../services/search-gateway/src/config';

describe('search-gateway runtime readiness wiring', () => {
  it('returns blocked omissions instead of crashing when one configured provider is missing secrets', async () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-runtime-readiness-'));
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(dir, 'google-cx'), 'google-cx');

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
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    expect(result.retrievalPlan?.omissions.some((item) => item.status === 'blocked')).toBe(
      true
    );
    expect(result.retrievalOutcome?.selectedRoute).toBe('google');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/search-gateway-runtime-readiness.test.ts`

Expected: FAIL because `createRuntimeGateway()` still uses `resolveSearchRuntime()` and throws when any configured provider in the project closure is invalid.

- [ ] **Step 3: Implement readiness-aware runtime wiring**

Modify `services/search-gateway/src/config.ts`:

```ts
import {
  loadConfigCenterState,
  type ResolvedPluginRuntime,
  resolvePluginRuntimeById,
  resolveSearchSourceReadiness
} from '@openfons/config-center';
```

```ts
const createAdapterFromResolvedPlugin = ({
  plugin,
  fetchImpl,
  ddgSearchImpl
}: {
  plugin: ResolvedPluginRuntime;
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
const buildRuntimeProviders = ({
  projectId,
  repoRoot,
  secretRoot,
  fetchImpl,
  ddgSearchImpl
}: {
  projectId: string;
  repoRoot: string;
  secretRoot?: string;
  fetchImpl?: typeof fetch;
  ddgSearchImpl?: Parameters<typeof createDdgAdapter>[0]['searchImpl'];
}) => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const searchSource = resolveSearchSourceReadiness({ state, projectId });

  const providers = Object.fromEntries(
    searchSource.routes
      .filter((route) => route.status !== 'blocked')
      .map((route) => {
        const pluginId = String(route.detail.pluginId);
        const plugin = resolvePluginRuntimeById({ state, pluginId });
        return createAdapterFromResolvedPlugin({
          plugin,
          fetchImpl,
          ddgSearchImpl
        });
      })
  ) as Partial<Record<SearchProviderId, SearchProviderAdapter>>;

  return { providers, searchSource };
};
```

```ts
  const { providers, searchSource } = buildRuntimeProviders({
    projectId,
    repoRoot,
    secretRoot,
    fetchImpl,
    ddgSearchImpl
  });

  return createSearchGateway({
    projectId,
    providers,
    dispatchCollectorRequests,
    runStore,
    resolveSourceReadiness: () => searchSource
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/search-gateway-runtime-readiness.test.ts`

Expected: PASS with 1 test passed and the gateway returning `retrievalPlan.omissions` instead of throwing during startup.

- [ ] **Step 5: Commit**

```bash
git add services/search-gateway/src/config.ts tests/integration/search-gateway-runtime-readiness.test.ts
git commit -m "feat(search-gateway): wire runtime readiness"
```

## Task 6: Attach Evidence Acquisition Metadata In The Real Collection Bridge

**Files:**
- Modify: `services/control-api/src/collection/real-collection-bridge.ts`
- Test: `tests/integration/real-collection-bridge-acquisition-meta.test.ts`

- [ ] **Step 1: Write the failing acquisition metadata test**

```ts
import { describe, expect, it } from 'vitest';
import { buildCompilation, buildOpportunity } from '../../services/control-api/src/compiler.js';
import {
  AI_PROCUREMENT_CAPTURE_TARGETS
} from '../../services/control-api/src/cases/ai-procurement.js';
import {
  createAiProcurementRealCollectionBridge
} from '../../services/control-api/src/collection/real-collection-bridge.js';

const createOpportunityInput = () => ({
  title: 'Direct API vs OpenRouter for AI Coding Teams',
  query: 'direct api vs openrouter',
  market: 'global',
  audience: 'small ai teams',
  problem: 'Teams need cheaper but reliable model procurement',
  outcome: 'Produce a source-backed report',
  geo: 'global',
  language: 'English'
});

describe('real collection bridge acquisition metadata', () => {
  it('threads retrieval outcome metadata into compiled evidence items', async () => {
    const opportunity = buildOpportunity(createOpportunityInput());
    const bridge = createAiProcurementRealCollectionBridge({
      searchClient: {
        search: async (request) => {
          const target = AI_PROCUREMENT_CAPTURE_TARGETS.find(
            (item) => item.query === request.query
          );

          if (!target) {
            throw new Error(`missing target for ${request.query}`);
          }

          return {
            searchRun: {
              id: 'search_run_001',
              projectId: 'openfons',
              opportunityId: opportunity.id,
              workflowId: 'wf_001',
              taskId: 'task_001',
              purpose: 'evidence',
              query: request.query,
              status: 'completed',
              selectedProviders: ['google'],
              degradedProviders: [],
              startedAt: '2026-04-13T19:00:00.000Z',
              finishedAt: '2026-04-13T19:00:01.000Z'
            },
            results: [
              {
                id: 'search_result_001',
                searchRunId: 'search_run_001',
                provider: 'google',
                title: target.title,
                url: target.url,
                snippet: `${target.title} snippet`,
                rank: 1,
                page: 1,
                domain: new URL(target.url).hostname,
                sourceKindGuess: target.sourceKind,
                dedupKey: `${target.key}-dedup`,
                selectedForUpgrade: false,
                selectionReason: 'matched-target'
              }
            ],
            upgradeCandidates: [],
            diagnostics: [],
            downgradeInfo: [],
            retrievalPlan: {
              sourceId: 'search',
              planVersion: 'v1',
              generatedAt: '2026-04-13T19:00:00.000Z',
              candidates: [
                {
                  routeKey: 'google',
                  qualityTier: 'primary',
                  status: 'ready',
                  priority: 100
                }
              ],
              omissions: []
            },
            retrievalOutcome: {
              sourceId: 'search',
              planVersion: 'v1',
              attempts: [
                {
                  sourceId: 'search',
                  routeKey: 'google',
                  attemptIndex: 0,
                  startedAt: '2026-04-13T19:00:00.000Z',
                  finishedAt: '2026-04-13T19:00:01.000Z',
                  decisionBasis: 'ready-primary',
                  result: 'succeeded'
                }
              ],
              selectedRoute: 'google',
              status: 'succeeded',
              omissions: []
            }
          };
        }
      }
    });

    const compiled = await buildCompilation(opportunity, {
      buildAiProcurementCaseBundle: bridge
    });

    expect(compiled.evidenceSet.items[0]?.acquisitionMeta).toMatchObject({
      sourceId: 'search',
      routeKey: 'google',
      retrievalStatus: 'succeeded'
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/real-collection-bridge-acquisition-meta.test.ts`

Expected: FAIL because compiled evidence items do not include `acquisitionMeta`.

- [ ] **Step 3: Implement acquisition metadata threading**

Modify `services/control-api/src/collection/real-collection-bridge.ts`:

```ts
import type {
  CollectionLog,
  EvidenceAcquisitionMeta,
  SearchRequest,
  SearchRunResult,
  SearchResult,
  SourceCapture
} from '@openfons/contracts';
```

```ts
const buildSearchAcquisitionMeta = (
  searchRun: SearchRunResult
): EvidenceAcquisitionMeta | undefined => {
  const selectedAttempt = searchRun.retrievalOutcome?.attempts.find(
    (attempt) => attempt.result === 'succeeded'
  );
  const selectedCandidate = searchRun.retrievalPlan?.candidates.find(
    (candidate) => candidate.routeKey === selectedAttempt?.routeKey
  );

  if (!selectedAttempt || !selectedCandidate) {
    return undefined;
  }

  return {
    sourceId: 'search',
    routeKey: selectedAttempt.routeKey,
    qualityTier: selectedCandidate.qualityTier,
    routeStatusAtAttempt: selectedCandidate.status,
    retrievalStatus: selectedAttempt.result,
    attemptedAt: selectedAttempt.finishedAt,
    decisionReason: selectedAttempt.decisionBasis,
    warnings: [],
    blockers: []
  };
};
```

```ts
    const acquisitionMetaByUrl = new Map<string, EvidenceAcquisitionMeta>();
```

```ts
      acquisitionMetaByUrl.set(selected.url, buildSearchAcquisitionMeta(searchRun) ?? {
        sourceId: 'search',
        routeKey: selected.provider,
        qualityTier: 'primary',
        routeStatusAtAttempt: 'ready',
        retrievalStatus: 'succeeded',
        attemptedAt: searchRun.searchRun.finishedAt ?? nowIso(),
        decisionReason: 'search-result-selected',
        warnings: [],
        blockers: []
      });
```

```ts
          acquisitionMeta: acquisitionMetaByUrl.get(
            deterministicTemplate.sourceCaptures.find(
              (capture) => capture.id === item.captureId
            )?.url ?? ''
          )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/real-collection-bridge-acquisition-meta.test.ts`

Expected: PASS with 1 test passed and the first evidence item containing `acquisitionMeta.sourceId === 'search'`.

- [ ] **Step 5: Commit**

```bash
git add services/control-api/src/collection/real-collection-bridge.ts tests/integration/real-collection-bridge-acquisition-meta.test.ts
git commit -m "feat(control-api): attach evidence acquisition metadata"
```

## Task 7: Run Focused Verification And Close The Batch

**Files:**
- Modify: none
- Test: `tests/contract/retrieval-orchestration-schema.test.ts`
- Test: `tests/integration/config-center-readiness.test.ts`
- Test: `tests/integration/control-api-config-center-readiness.test.ts`
- Test: `tests/integration/search-gateway-retrieval.test.ts`
- Test: `tests/integration/search-gateway-runtime-readiness.test.ts`
- Test: `tests/integration/real-collection-bridge-acquisition-meta.test.ts`

- [ ] **Step 1: Run the focused Vitest suite**

Run:

```bash
pnpm vitest run tests/contract/retrieval-orchestration-schema.test.ts tests/integration/config-center-readiness.test.ts tests/integration/control-api-config-center-readiness.test.ts tests/integration/search-gateway-retrieval.test.ts tests/integration/search-gateway-runtime-readiness.test.ts tests/integration/real-collection-bridge-acquisition-meta.test.ts
```

Expected: PASS with all 6 test files green.

- [ ] **Step 2: Run lint and typecheck**

Run:

```bash
pnpm lint
pnpm typecheck
```

Expected: PASS with no TypeScript errors in `packages/contracts`, `packages/config-center`, `packages/search-gateway`, `services/control-api`, and `services/search-gateway`.

- [ ] **Step 3: Run the workspace build**

Run:

```bash
pnpm build
```

Expected: PASS and updated `dist/` outputs for the touched packages and services.

- [ ] **Step 4: Commit the verified batch**

```bash
git add packages/contracts/src/index.ts packages/contracts/src/retrieval-orchestration.ts packages/config-center/src/index.ts packages/config-center/src/readiness.ts packages/config-center/src/runtime/search.ts packages/search-gateway/src/gateway.ts packages/search-gateway/src/index.ts packages/search-gateway/src/retrieval.ts services/control-api/src/config-center/router.ts services/control-api/src/config-center/service.ts services/control-api/src/collection/real-collection-bridge.ts services/search-gateway/src/config.ts tests/contract/retrieval-orchestration-schema.test.ts tests/integration/config-center-readiness.test.ts tests/integration/control-api-config-center-readiness.test.ts tests/integration/search-gateway-retrieval.test.ts tests/integration/search-gateway-runtime-readiness.test.ts tests/integration/real-collection-bridge-acquisition-meta.test.ts
git commit -m "feat(retrieval): ship readiness and orchestration v1"
```

## Spec Coverage Check

- Shared objects are covered in Task 1.
- `config-center` readiness core is covered in Task 2.
- `control-api` operator-facing read surface is covered in Task 3.
- `search-gateway` retrieval planning and outcome emission are covered in Task 4.
- `search-gateway` runtime adoption is covered in Task 5.
- evidence metadata consumer adoption is covered in Task 6.
- focused verification and handoff closure are covered in Task 7.

## Implementation Notes

- Keep `control-api` authoritative for operator-facing readiness reads. Do not let `search-gateway` invent its own readiness vocabulary.
- Keep `search-gateway` limited to `sourceId: 'search'` in this first executor rollout. The contracts stay generic, but the first concrete executor should stay inside the existing search-provider scope.
- For crawler sources that only have one configured route today, use the current binding route key as both `sourceId` and `routeKey` in readiness output. Do not invent synthetic route identifiers in this batch.
- `ProjectReadinessReportSchema` is a transport envelope for the operator API. Treat the six spec-approved objects as the real shared domain primitives and keep any wrappers thin.
