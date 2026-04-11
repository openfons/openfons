# AI Procurement Artifact Delivery Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make successful AI procurement compile write a formal HTML artifact under `artifacts/generated/ai-procurement/**`, return file-backed artifact metadata, and keep the pure builder side-effect-free for non-API callers.

**Architecture:** Add a small `services/control-api/src/artifacts/` slice that owns repo-relative path generation, shared `ReportView` assembly, HTML artifact delivery, and finalized compilation wrapping. Keep `buildCompilation()` pure, invoke artifact delivery only from the formal compile API path, and persist the finalized compilation in the in-memory store for later inspection and debugging.

**Tech Stack:** TypeScript, Hono, Vitest, Node `fs/promises`, pnpm workspaces

---

## Planned File Map

**Create**
- `services/control-api/src/artifacts/paths.ts`
- `services/control-api/src/artifacts/report-view.ts`
- `services/control-api/src/artifacts/report-html.ts`
- `services/control-api/src/artifacts/delivery.ts`
- `tests/integration/control-api-artifacts.test.ts`
- `tests/contract/gitignore.test.ts`

**Modify**
- `packages/domain-models/src/index.ts`
- `services/control-api/src/app.ts`
- `services/control-api/src/store.ts`
- `services/control-api/src/report-export/static-html.ts`
- `tests/contract/domain-models.test.ts`
- `tests/contract/contracts-schema.test.ts`
- `tests/integration/control-api.test.ts`
- `tests/integration/report-static-export.test.ts`
- `tests/contract/dockerignore.test.ts`
- `.gitignore`
- `.dockerignore`

### Task 1: Widen the artifact model and update finalized-compile fixtures

**Files:**
- Modify: `packages/domain-models/src/index.ts`
- Modify: `tests/contract/domain-models.test.ts`
- Modify: `tests/contract/contracts-schema.test.ts`

- [ ] **Step 1: Write the failing contract tests**

```ts
it('creates both memory and file-backed artifacts explicitly', () => {
  const topicRun = createTopicRun('opp_001', 'wf_001', 'ai-procurement');

  const memoryArtifact = createArtifact(
    topicRun.id,
    'report',
    `memory://report/report_001`,
    'report_001'
  );

  const fileArtifact = createArtifact(
    topicRun.id,
    'report',
    'artifacts/generated/ai-procurement/direct-api-vs-openrouter-report_001/report.html',
    'report_001',
    { storage: 'file' }
  );

  expect(memoryArtifact.storage).toBe('memory');
  expect(fileArtifact.storage).toBe('file');
});
```

```ts
it('parses a finalized compilation result with a file-backed report artifact', () => {
  const parsed = CompilationResultSchema.parse(createValidCompilationResult());

  expect(parsed.artifacts[0]).toMatchObject({
    type: 'report',
    storage: 'file',
    uri: 'artifacts/generated/ai-procurement/direct-api-vs-openrouter-ai-coding-report_001/report.html'
  });
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `pnpm test -- tests/contract/domain-models.test.ts tests/contract/contracts-schema.test.ts`

Expected: FAIL because `createArtifact()` does not yet accept an explicit storage option and the finalized compile fixture still assumes `memory://report/...`.

- [ ] **Step 3: Implement the minimal artifact-model widening**

```ts
export type CreateArtifactOptions = {
  storage?: ArtifactStorage;
};

export const createArtifact = (
  topicRunId: string,
  type: ArtifactType,
  uri: string,
  reportId?: string,
  options: CreateArtifactOptions = {}
): Artifact => ({
  id: createId('art'),
  topicRunId,
  reportId,
  type,
  storage: options.storage ?? 'memory',
  uri,
  createdAt: nowIso()
});
```

```ts
artifacts: [
  {
    id: 'art_001',
    topicRunId: 'run_001',
    reportId: 'report_001',
    type: 'report' as const,
    storage: 'file' as const,
    uri: 'artifacts/generated/ai-procurement/direct-api-vs-openrouter-ai-coding-report_001/report.html',
    createdAt: '2026-03-30T08:10:00.000Z'
  }
]
```

- [ ] **Step 4: Re-run the focused tests**

Run: `pnpm test -- tests/contract/domain-models.test.ts tests/contract/contracts-schema.test.ts`

Expected: PASS with the domain-model test proving both storage modes and the contract fixture now representing finalized compile output.

- [ ] **Step 5: Commit the isolated artifact-model change**

```bash
git add packages/domain-models/src/index.ts tests/contract/domain-models.test.ts tests/contract/contracts-schema.test.ts
git commit -m "feat: widen artifact model for file-backed delivery"
```

### Task 2: Add shared artifact paths and `ReportView` assembly helpers

**Files:**
- Create: `services/control-api/src/artifacts/paths.ts`
- Create: `services/control-api/src/artifacts/report-view.ts`
- Create: `tests/integration/control-api-artifacts.test.ts`

- [ ] **Step 1: Write failing helper tests**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { buildAiProcurementCase } from '../../services/control-api/src/cases/ai-procurement.js';
import {
  buildCompilation,
  buildOpportunity
} from '../../services/control-api/src/compiler.js';
import { DIRECT_API_VS_OPENROUTER_INPUT } from '../../services/control-api/src/report-export/static-html.js';
import { resolveAiProcurementReportArtifactPaths } from '../../services/control-api/src/artifacts/paths.js';
import { buildReportView } from '../../services/control-api/src/artifacts/report-view.js';
import { deliverAiProcurementCompilation } from '../../services/control-api/src/artifacts/delivery.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

const createCompiledFixture = async () => {
  const opportunity = buildOpportunity(DIRECT_API_VS_OPENROUTER_INPUT);

  return buildCompilation(opportunity, {
    buildAiProcurementCaseBundle: async (nextOpportunity, workflow) =>
      buildAiProcurementCase(nextOpportunity, workflow)
  });
};
```

```ts
it('builds a normalized repo-relative report artifact path', async () => {
  const compiled = await createCompiledFixture();
  const location = resolveAiProcurementReportArtifactPaths(
    'C:\\repo-root',
    compiled.report
  );

  expect(location.relativePath).toBe(
    `artifacts/generated/ai-procurement/${compiled.report.slug}-${compiled.report.id}/report.html`
  );
  expect(location.tempRelativePath).toBe(
    `artifacts/generated/ai-procurement/${compiled.report.slug}-${compiled.report.id}/report.html.tmp`
  );
  expect(location.relativePath.includes('\\')).toBe(false);
});
```

```ts
it('builds a canonical report view from a compilation result', async () => {
  const compiled = await createCompiledFixture();
  const reportView = buildReportView(compiled);

  expect(reportView).toMatchObject({
    report: compiled.report,
    evidenceSet: compiled.evidenceSet,
    sourceCaptures: compiled.sourceCaptures,
    collectionLogs: compiled.collectionLogs
  });
});
```

```ts
it('keeps the pure builder provisional for non-api callers', async () => {
  const compiled = await createCompiledFixture();

  expect(compiled.artifacts[0]).toMatchObject({
    storage: 'memory',
    uri: `memory://report/${compiled.report.id}`
  });
});
```

- [ ] **Step 2: Run the helper tests to verify they fail**

Run: `pnpm test -- tests/integration/control-api-artifacts.test.ts`

Expected: FAIL because `services/control-api/src/artifacts/paths.ts` and `services/control-api/src/artifacts/report-view.ts` do not exist yet.

- [ ] **Step 3: Implement the path and report-view helpers**

```ts
import { join, resolve } from 'node:path';
import type { ReportSpec } from '@openfons/contracts';

const normalizePath = (value: string): string => value.replaceAll('\\', '/');

export const resolveAiProcurementReportArtifactPaths = (
  repoRoot: string,
  report: Pick<ReportSpec, 'id' | 'slug'>
) => {
  const relativeDir = normalizePath(
    join('artifacts', 'generated', 'ai-procurement', `${report.slug}-${report.id}`)
  );

  return {
    relativeDir,
    relativePath: `${relativeDir}/report.html`,
    tempRelativePath: `${relativeDir}/report.html.tmp`,
    absoluteDir: resolve(repoRoot, relativeDir),
    absolutePath: resolve(repoRoot, relativeDir, 'report.html'),
    tempAbsolutePath: resolve(repoRoot, relativeDir, 'report.html.tmp')
  };
};
```

```ts
import type { CompilationResult, ReportView } from '@openfons/contracts';

export const buildReportView = (
  compilation: Pick<
    CompilationResult,
    'report' | 'evidenceSet' | 'sourceCaptures' | 'collectionLogs'
  >
): ReportView => ({
  report: compilation.report,
  evidenceSet: compilation.evidenceSet,
  sourceCaptures: compilation.sourceCaptures,
  collectionLogs: compilation.collectionLogs
});
```

- [ ] **Step 4: Re-run the helper tests**

Run: `pnpm test -- tests/integration/control-api-artifacts.test.ts`

Expected: PASS with normalized `/` paths on Windows and a single reusable `ReportView` assembly helper.

- [ ] **Step 5: Commit the helper layer**

```bash
git add services/control-api/src/artifacts/paths.ts services/control-api/src/artifacts/report-view.ts tests/integration/control-api-artifacts.test.ts
git commit -m "feat: add ai procurement artifact helper layer"
```

### Task 3: Add formal HTML artifact delivery with atomic write semantics

**Files:**
- Create: `services/control-api/src/artifacts/report-html.ts`
- Create: `services/control-api/src/artifacts/delivery.ts`
- Modify: `tests/integration/control-api-artifacts.test.ts`

- [ ] **Step 1: Extend the helper test file with delivery-path failures and success cases**

```ts
it('writes a finalized file-backed report artifact', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'openfons-artifact-delivery-'));
  tempDirs.push(tempDir);
  const compiled = await createCompiledFixture();
  const finalized = await deliverAiProcurementCompilation(compiled, {
    repoRoot: tempDir
  });

  expect(finalized.artifacts).toHaveLength(1);
  expect(finalized.artifacts[0]).toMatchObject({
    type: 'report',
    storage: 'file',
    uri: `artifacts/generated/ai-procurement/${compiled.report.slug}-${compiled.report.id}/report.html`
  });

  await expect(
    readFile(resolve(tempDir, finalized.artifacts[0].uri), 'utf8')
  ).resolves.toContain(compiled.report.title);
});
```

```ts
it('removes the temp artifact file when the write fails', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'openfons-artifact-delivery-'));
  tempDirs.push(tempDir);
  const compiled = await createCompiledFixture();
  const writeSpy = vi
    .spyOn(fs, 'writeFile')
    .mockRejectedValueOnce(new Error('disk full'));

  await expect(
    deliverAiProcurementCompilation(compiled, { repoRoot: tempDir })
  ).rejects.toThrow('disk full');

  expect(
    existsSync(
      resolve(
        tempDir,
        'artifacts/generated/ai-procurement',
        `${compiled.report.slug}-${compiled.report.id}`,
        'report.html.tmp'
      )
    )
  ).toBe(false);

  writeSpy.mockRestore();
});
```

```ts
it('reuses the same artifact path when the same report is delivered twice', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'openfons-artifact-delivery-'));
  tempDirs.push(tempDir);
  const compiled = await createCompiledFixture();
  const first = await deliverAiProcurementCompilation(compiled, {
    repoRoot: tempDir
  });

  await writeFile(resolve(tempDir, first.artifacts[0].uri), 'stale html', 'utf8');

  const second = await deliverAiProcurementCompilation(compiled, {
    repoRoot: tempDir
  });

  expect(second.artifacts[0].uri).toBe(first.artifacts[0].uri);
  await expect(
    readFile(resolve(tempDir, second.artifacts[0].uri), 'utf8')
  ).resolves.toContain(compiled.report.title);
});
```

- [ ] **Step 2: Run the delivery tests to verify they fail**

Run: `pnpm test -- tests/integration/control-api-artifacts.test.ts`

Expected: FAIL because `deliverAiProcurementCompilation()` and the atomic write helpers do not exist yet.

- [ ] **Step 3: Implement the delivery slice**

```ts
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { createArtifact } from '@openfons/domain-models';
import type { Artifact, ReportView } from '@openfons/contracts';
import { renderStaticReportHtml } from '../report-export/static-html.js';
import { resolveAiProcurementReportArtifactPaths } from './paths.js';

export const writeReportHtmlArtifact = async ({
  repoRoot,
  topicRunId,
  reportView
}: {
  repoRoot: string;
  topicRunId: string;
  reportView: ReportView;
}): Promise<Artifact> => {
  const location = resolveAiProcurementReportArtifactPaths(repoRoot, reportView.report);
  const html = renderStaticReportHtml(reportView, {
    eyebrow: 'AI Procurement Decision Guide',
    narrativeTitle: 'Decision Guide',
    narrativeMeta: 'Decision points backed by the compiled evidence set',
    sourcesMeta: 'Official and corroborating references',
    footerNote: 'Generated from the OpenFons evidence-backed report pipeline.'
  });

  await mkdir(location.absoluteDir, { recursive: true });

  try {
    await writeFile(location.tempAbsolutePath, html, 'utf8');
    await rename(location.tempAbsolutePath, location.absolutePath);
  } catch (error) {
    await rm(location.tempAbsolutePath, { force: true });
    throw error;
  }

  return createArtifact(
    topicRunId,
    'report',
    location.relativePath,
    reportView.report.id,
    { storage: 'file' }
  );
};
```

```ts
import type { CompilationResult } from '@openfons/contracts';
import { buildReportView } from './report-view.js';
import { writeReportHtmlArtifact } from './report-html.js';

export const deliverAiProcurementCompilation = async (
  compilation: CompilationResult,
  options: { repoRoot: string }
): Promise<CompilationResult> => {
  const reportView = buildReportView(compilation);
  const reportArtifact = await writeReportHtmlArtifact({
    repoRoot: options.repoRoot,
    topicRunId: compilation.topicRun.id,
    reportView
  });

  return {
    ...compilation,
    artifacts: compilation.artifacts
      .filter((artifact) => artifact.type !== 'report')
      .concat(reportArtifact)
  };
};
```

- [ ] **Step 4: Re-run the delivery tests**

Run: `pnpm test -- tests/integration/control-api-artifacts.test.ts`

Expected: PASS with a real `report.html`, a file-backed artifact URI, no leftover `.tmp` file after a forced write failure, and stable overwrite behavior when the same `report.id` is delivered twice.

- [ ] **Step 5: Commit the delivery slice**

```bash
git add services/control-api/src/artifacts/report-html.ts services/control-api/src/artifacts/delivery.ts tests/integration/control-api-artifacts.test.ts
git commit -m "feat: add formal report artifact delivery"
```

### Task 4: Integrate formal delivery into `control-api` while keeping the builder pure

**Files:**
- Modify: `services/control-api/src/app.ts`
- Modify: `services/control-api/src/store.ts`
- Modify: `services/control-api/src/report-export/static-html.ts`
- Modify: `tests/integration/control-api.test.ts`
- Modify: `tests/integration/report-static-export.test.ts`

- [ ] **Step 1: Add failing API and export regression tests**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createMemoryStore } from '../../services/control-api/src/store';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});
```

```ts
it('returns a finalized file-backed artifact from the compile route and stores it in memory', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'openfons-control-api-'));
  tempDirs.push(tempDir);
  const store = createMemoryStore();
  const app = createApp(
    {
      artifactDelivery: { repoRoot: tempDir },
      buildAiProcurementCaseBundle: async (opportunity, workflow) =>
        createRealBridgeBundle(opportunity, workflow)
    },
    store
  );

  const createResponse = await app.request('/api/v1/opportunities', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(createOpportunityInput())
  });
  const created = await createResponse.json();
  const compileResponse = await app.request(
    `/api/v1/opportunities/${created.opportunity.id}/compile`,
    { method: 'POST' }
  );
  const compiled = await compileResponse.json();

  expect(compiled.artifacts[0]).toMatchObject({
    storage: 'file',
    uri: `artifacts/generated/ai-procurement/${compiled.report.slug}-${compiled.report.id}/report.html`
  });
  await expect(
    readFile(resolve(tempDir, compiled.artifacts[0].uri), 'utf8')
  ).resolves.toContain(compiled.report.title);
  expect(store.getCompilationByReportId(compiled.report.id)?.artifacts[0].uri).toBe(
    compiled.artifacts[0].uri
  );
});
```

```ts
it('does not persist a report view when artifact delivery fails', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'openfons-control-api-'));
  tempDirs.push(tempDir);
  const blockedRepoRoot = join(tempDir, 'repo-root-blocker');
  await writeFile(blockedRepoRoot, 'not a directory');

  let saveCompilationCalled = false;
  const baseStore = createMemoryStore();
  const store = {
    ...baseStore,
    saveCompilation: (result: CompilationResult) => {
      saveCompilationCalled = true;
      baseStore.saveCompilation(result);
    }
  };

  const app = createApp(
    {
      artifactDelivery: { repoRoot: blockedRepoRoot },
      buildAiProcurementCaseBundle: async (opportunity, workflow) =>
        createRealBridgeBundle(opportunity, workflow)
    },
    store
  );

  const createResponse = await app.request('/api/v1/opportunities', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(createOpportunityInput())
  });
  const created = await createResponse.json();
  const compileResponse = await app.request(
    `/api/v1/opportunities/${created.opportunity.id}/compile`,
    { method: 'POST' }
  );

  expect(compileResponse.status).toBe(500);
  expect(saveCompilationCalled).toBe(false);
});
```

```ts
it('keeps workbench export on the pure builder path', async () => {
  const reportView = await buildDirectApiVsOpenRouterReportView();

  expect(reportView.report.id).toMatch(/^report_/);
  expect(reportView.report.claims.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the API and export tests to verify they fail**

Run: `pnpm test -- tests/integration/control-api.test.ts tests/integration/report-static-export.test.ts`

Expected: FAIL because `createApp()` does not yet finalize artifact delivery, the store cannot return finalized compilations, and `static-html.ts` still duplicates `ReportView` assembly.

- [ ] **Step 3: Implement the minimal integration changes**

```ts
type CreateAppOptions = BuildCompilationOptions & {
  artifactDelivery?: {
    repoRoot?: string;
  };
  configCenter?: {
    repoRoot: string;
    secretRoot?: string;
  };
};
```

```ts
const { configCenter, artifactDelivery, ...compilationOptions } = options;
const artifactRepoRoot = artifactDelivery?.repoRoot ?? process.cwd();

app.post('/api/v1/opportunities/:opportunityId/compile', async (c) => {
  const compiled = await buildCompilation(opportunity, compilationOptions);
  const finalized = await deliverAiProcurementCompilation(compiled, {
    repoRoot: artifactRepoRoot
  });

  store.saveCompilation(finalized);
  return c.json(finalized);
});
```

```ts
export type MemoryStore = {
  getOpportunity: (id: string) => OpportunitySpec | undefined;
  saveOpportunity: (opportunity: OpportunitySpec) => void;
  saveCompilation: (result: CompilationResult) => void;
  getCompilationByReportId: (reportId: string) => CompilationResult | undefined;
  getReportView: (id: string) => ReportView | undefined;
};

const compilations = new Map<string, CompilationResult>();

saveCompilation: (result) => {
  opportunities.set(result.opportunity.id, result.opportunity);
  compilations.set(result.report.id, result);
  reportViews.set(result.report.id, buildReportView(result));
},
getCompilationByReportId: (reportId) => compilations.get(reportId)
```

```ts
export const buildDirectApiVsOpenRouterReportView = async (): Promise<ReportView> => {
  const opportunity = buildOpportunity(DIRECT_API_VS_OPENROUTER_INPUT);
  const compiled = await buildCompilation(opportunity, {
    buildAiProcurementCaseBundle: async (nextOpportunity, workflow) =>
      buildAiProcurementCase(nextOpportunity, workflow)
  });

  return buildReportView(compiled);
};
```

- [ ] **Step 4: Re-run the API and export tests**

Run: `pnpm test -- tests/integration/control-api.test.ts tests/integration/report-static-export.test.ts`

Expected: PASS with compile returning a file-backed artifact, the store retaining finalized compilation metadata, and workbench export remaining on the pure builder path.

- [ ] **Step 5: Commit the integration layer**

```bash
git add services/control-api/src/app.ts services/control-api/src/store.ts services/control-api/src/report-export/static-html.ts tests/integration/control-api.test.ts tests/integration/report-static-export.test.ts
git commit -m "feat: wire artifact delivery into formal compile"
```

### Task 5: Ignore generated artifacts and run full closure verification

**Files:**
- Modify: `.gitignore`
- Modify: `.dockerignore`
- Modify: `tests/contract/dockerignore.test.ts`
- Create: `tests/contract/gitignore.test.ts`

- [ ] **Step 1: Add failing ignore-rule tests**

```ts
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const gitignorePath = resolve(__dirname, '..', '..', '.gitignore');

describe('.gitignore', () => {
  it('exists and excludes generated runtime artifacts from git tracking', () => {
    expect(existsSync(gitignorePath)).toBe(true);

    const entries = readFileSync(gitignorePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    expect(entries).toContain('artifacts/generated/');
  });
});
```

```ts
it('exists and excludes sensitive or bulky local artifacts from build context', () => {
  expect(existsSync(dockerignorePath)).toBe(true);

  const entries = readFileSync(dockerignorePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  expect(entries).toContain('Memory/');
  expect(entries).toContain('labs/');
  expect(entries).toContain('accounts.db');
  expect(entries).toContain('artifacts/generated/');
});
```

- [ ] **Step 2: Run the ignore-rule tests to verify they fail**

Run: `pnpm test -- tests/contract/dockerignore.test.ts tests/contract/gitignore.test.ts`

Expected: FAIL because neither ignore file currently excludes `artifacts/generated/`.

- [ ] **Step 3: Update the ignore files**

```gitignore
artifacts/generated/
```

```dockerignore
artifacts/generated/
```

- [ ] **Step 4: Run the closure verification suite**

Run: `pnpm test -- tests/contract/domain-models.test.ts tests/contract/contracts-schema.test.ts tests/contract/dockerignore.test.ts tests/contract/gitignore.test.ts tests/integration/control-api-artifacts.test.ts tests/integration/control-api.test.ts tests/integration/report-static-export.test.ts tests/smoke/report-web.test.tsx`

Expected: PASS, proving artifact model, helper layer, API compile delivery, export regression coverage, ignore rules, and `report-web` smoke behavior.

Run: `pnpm typecheck`

Expected: PASS across the workspace with the new `artifacts/` slice wired into `control-api`.

Run: `pnpm build`

Expected: PASS, including `@openfons/control-api` build output with the new delivery files.

- [ ] **Step 5: Commit the ignore rules and verified closure**

```bash
git add .gitignore .dockerignore tests/contract/dockerignore.test.ts tests/contract/gitignore.test.ts
git commit -m "chore: ignore generated ai procurement artifacts"
```

```bash
git status --short
```

Expected: clean working tree before opening the next implementation batch or requesting final review.
