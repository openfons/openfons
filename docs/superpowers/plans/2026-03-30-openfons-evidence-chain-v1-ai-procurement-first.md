# OpenFons Evidence Chain V1 (AI Procurement First) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `OpportunitySpec -> ReportSpec` shell demo with one auditable `AI procurement` evidence chain that runs `OpportunitySpec -> TaskSpec / WorkflowSpec -> TopicRun -> SourceCapture / CollectionLog -> EvidenceSet -> ReportView`, then renders the result in `report-web`.

**Architecture:** Keep the existing TypeScript monorepo and in-memory `control-api` runtime. Extend contracts first, then add matching domain-model factories, then compile one deterministic `AI procurement` case bundle from curated source captures and evidence items, and finally render a `ReportView` bundle that shows claims, source provenance, risks, and update timestamps. Defer persistence, multi-case orchestration, and `OpenClaw` reuse until this single chain is stable.

**Tech Stack:** TypeScript, Zod, Hono, React, Vitest, Testing Library, pnpm

---

## File Map

- Modify: `packages/contracts/src/index.ts`
  Add v1 schemas for `TopicRun`, `SourceCapture`, `CollectionLog`, `Evidence`, `EvidenceSet`, `Artifact`, `ReportClaim`, `ReportSourceRef`, `ReportView`, and extend `CompilationResult`.
- Modify: `packages/domain-models/src/index.ts`
  Add matching factory helpers for topic runs, captures, collection logs, evidence items, evidence sets, and artifacts.
- Create: `services/control-api/src/cases/ai-procurement.ts`
  Hold the single curated first-case bundle so `compiler.ts` stays focused on orchestration, not hard-coded page content.
- Modify: `services/control-api/src/compiler.ts`
  Compile the new evidence chain and build a richer report from evidence-backed claims.
- Modify: `services/control-api/src/store.ts`
  Store `topicRun`, `sourceCaptures`, `collectionLogs`, `evidenceSet`, `artifacts`, and expose `getReportView`.
- Modify: `services/control-api/src/app.ts`
  Return `ReportView` from the report endpoint.
- Modify: `apps/report-web/src/api.ts`
  Load `ReportView` instead of raw `ReportSpec`.
- Modify: `apps/report-web/src/pages/report-page.tsx`
  Render report metadata, claims, source list, evidence links, risk boundaries, and update log.
- Modify: `apps/report-web/src/styles.css`
  Add layout rules for evidence cards and claim-to-source references.
- Modify: `tests/contract/contracts-schema.test.ts`
  Cover the richer contracts and `ReportView`.
- Modify: `tests/contract/domain-models.test.ts`
  Cover the new domain-model factories.
- Modify: `tests/integration/control-api.test.ts`
  Cover the new compile output and the `ReportView` endpoint.
- Modify: `tests/smoke/report-web.test.tsx`
  Assert that the page renders claims, source provenance, and risk sections from `ReportView`.

### Task 1: Extend the contracts around the evidence chain

**Files:**
- Modify: `packages/contracts/src/index.ts`
- Test: `tests/contract/contracts-schema.test.ts`

- [ ] **Step 1: Write the failing contract test for the new chain**

```ts
import { describe, expect, it } from 'vitest';
import {
  CompilationResultSchema,
  OpportunityInputSchema,
  ReportSpecSchema,
  ReportViewSchema
} from '@openfons/contracts';

function createValidCompilationResult() {
  return {
    opportunity: {
      id: 'opp_001',
      slug: 'direct-api-vs-openrouter-ai-coding',
      title: 'Direct API vs OpenRouter for AI Coding Teams',
      market: 'global',
      input: {
        title: 'Direct API vs OpenRouter for AI Coding Teams',
        query: 'direct api vs openrouter',
        market: 'global',
        audience: 'small ai teams',
        problem: 'Teams need cheaper but reliable model procurement',
        outcome: 'Produce a source-backed report',
        geo: 'global',
        language: 'English'
      },
      status: 'compiled' as const,
      createdAt: '2026-03-30T08:00:00.000Z',
      audience: 'small ai teams',
      geo: 'global',
      language: 'English',
      searchIntent: 'comparison' as const,
      angle: 'Compare direct provider buying with relay platforms',
      firstDeliverySurface: 'report-web' as const,
      pageCandidates: [
        {
          slug: 'direct-api-vs-openrouter-ai-coding',
          title: 'Direct API vs OpenRouter for AI Coding Teams',
          query: 'direct api vs openrouter'
        }
      ],
      evidenceRequirements: [
        {
          kind: 'official-pricing' as const,
          note: 'Capture official provider and relay pricing pages.'
        }
      ],
      productOpportunityHints: [
        {
          kind: 'tracker' as const,
          note: 'Track provider pricing and routing changes over time.'
        }
      ]
    },
    tasks: [
      {
        id: 'task_001',
        opportunityId: 'opp_001',
        kind: 'collect-evidence' as const,
        status: 'ready' as const
      },
      {
        id: 'task_002',
        opportunityId: 'opp_001',
        kind: 'score-opportunity' as const,
        status: 'ready' as const
      },
      {
        id: 'task_003',
        opportunityId: 'opp_001',
        kind: 'render-report' as const,
        status: 'ready' as const
      }
    ],
    workflow: {
      id: 'wf_001',
      opportunityId: 'opp_001',
      taskIds: ['task_001', 'task_002', 'task_003'],
      status: 'ready' as const
    },
    topicRun: {
      id: 'run_001',
      opportunityId: 'opp_001',
      workflowId: 'wf_001',
      topicKey: 'ai-procurement',
      status: 'compiled' as const,
      startedAt: '2026-03-30T08:00:00.000Z',
      updatedAt: '2026-03-30T08:10:00.000Z'
    },
    sourceCaptures: [
      {
        id: 'cap_001',
        topicRunId: 'run_001',
        title: 'OpenAI API pricing',
        url: 'https://platform.openai.com/pricing',
        sourceKind: 'official' as const,
        useAs: 'primary' as const,
        reportability: 'reportable' as const,
        riskLevel: 'low' as const,
        captureType: 'pricing-page' as const,
        status: 'captured' as const,
        accessedAt: '2026-03-30T08:00:00.000Z',
        capturedAt: '2026-03-30T08:00:00.000Z',
        language: 'en',
        region: 'global',
        summary: 'Provider pricing page capture'
      }
    ],
    collectionLogs: [
      {
        id: 'log_001',
        topicRunId: 'run_001',
        captureId: 'cap_001',
        step: 'capture' as const,
        status: 'success' as const,
        message: 'Captured official pricing page.',
        createdAt: '2026-03-30T08:00:00.000Z'
      }
    ],
    evidenceSet: {
      id: 'es_001',
      topicRunId: 'run_001',
      createdAt: '2026-03-30T08:05:00.000Z',
      updatedAt: '2026-03-30T08:10:00.000Z',
      items: [
        {
          id: 'evi_001',
          topicRunId: 'run_001',
          captureId: 'cap_001',
          kind: 'pricing' as const,
          statement: 'Official provider pricing must anchor direct-buy comparisons.',
          sourceKind: 'official' as const,
          useAs: 'primary' as const,
          reportability: 'reportable' as const,
          riskLevel: 'low' as const,
          freshnessNote: 'Verified during the current run.',
          supportingCaptureIds: ['cap_001']
        }
      ]
    },
    report: {
      id: 'report_001',
      opportunityId: 'opp_001',
      slug: 'direct-api-vs-openrouter-ai-coding',
      title: 'Direct API vs OpenRouter for AI Coding Teams',
      summary: 'A source-backed comparison for the first AI procurement run.',
      audience: 'small ai teams',
      geo: 'global',
      language: 'English',
      thesis: 'Use direct providers when compliance and invoice certainty matter most; use relays when coverage and routing flexibility dominate.',
      claims: [
        {
          id: 'claim_001',
          label: 'Direct purchase anchor',
          statement: 'Direct provider pricing must be the comparison anchor.',
          evidenceIds: ['evi_001']
        }
      ],
      sourceIndex: [
        {
          captureId: 'cap_001',
          title: 'OpenAI API pricing',
          url: 'https://platform.openai.com/pricing',
          sourceKind: 'official' as const,
          useAs: 'primary' as const,
          reportability: 'reportable' as const,
          riskLevel: 'low' as const,
          lastCheckedAt: '2026-03-30T08:00:00.000Z'
        }
      ],
      sections: [
        {
          id: 'sec_001',
          title: 'Quick Answer',
          body: 'Start from official pricing and availability pages, then layer relay tradeoffs on top.'
        }
      ],
      evidenceBoundaries: ['Do not publish pricing claims without an official pricing capture.'],
      risks: ['Community complaints can corroborate pain points but cannot define final pricing claims alone.'],
      updateLog: [
        {
          at: '2026-03-30T08:10:00.000Z',
          note: 'Initial AI procurement evidence-backed report compiled.'
        }
      ],
      createdAt: '2026-03-30T08:10:00.000Z',
      updatedAt: '2026-03-30T08:10:00.000Z'
    },
    artifacts: [
      {
        id: 'art_001',
        topicRunId: 'run_001',
        reportId: 'report_001',
        type: 'report' as const,
        storage: 'memory' as const,
        uri: 'memory://report/report_001',
        createdAt: '2026-03-30T08:10:00.000Z'
      }
    ]
  };
}

describe('@openfons/contracts', () => {
  it('parses a report view built from the evidence chain', () => {
    const compilation = createValidCompilationResult();
    const parsed = CompilationResultSchema.parse(compilation);
    const view = ReportViewSchema.parse({
      report: parsed.report,
      evidenceSet: parsed.evidenceSet,
      sourceCaptures: parsed.sourceCaptures,
      collectionLogs: parsed.collectionLogs
    });

    expect(view.report.claims[0].evidenceIds).toEqual(['evi_001']);
    expect(view.sourceCaptures[0].sourceKind).toBe('official');
    expect(view.evidenceSet.items[0].statement).toContain('comparison anchor');
  });
});
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run:

```powershell
pnpm test -- tests/contract/contracts-schema.test.ts
```

Expected: FAIL with missing exports such as `ReportViewSchema`, `claims`, or `sourceIndex`.

- [ ] **Step 3: Implement the new contract schemas**

```ts
export const SourceKindSchema = z.enum([
  'official',
  'community',
  'commercial',
  'inference'
]);

export const SourceUseAsSchema = z.enum([
  'primary',
  'secondary',
  'corroboration',
  'discovery-only'
]);

export const ReportabilitySchema = z.enum([
  'reportable',
  'caveated',
  'blocked'
]);

export const RiskLevelSchema = z.enum(['low', 'medium', 'high']);
export const CaptureTypeSchema = z.enum([
  'pricing-page',
  'availability-page',
  'doc-page',
  'community-thread',
  'analysis-note'
]);
export const CaptureStatusSchema = z.enum(['captured', 'failed']);
export const TopicRunStatusSchema = z.enum([
  'planned',
  'captured',
  'qualified',
  'compiled'
]);
export const CollectionStepSchema = z.enum([
  'discover',
  'capture',
  'qualify',
  'compile'
]);
export const CollectionStatusSchema = z.enum([
  'success',
  'warning',
  'error'
]);
export const EvidenceKindSchema = z.enum([
  'pricing',
  'availability',
  'routing',
  'language',
  'community',
  'inference'
]);
export const ArtifactTypeSchema = z.enum([
  'opportunity',
  'topic-run',
  'evidence-set',
  'report'
]);

export const TopicRunSchema = z.object({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  workflowId: z.string().min(1),
  topicKey: z.string().min(1),
  status: TopicRunStatusSchema,
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const SourceCaptureSchema = z.object({
  id: z.string().min(1),
  topicRunId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  sourceKind: SourceKindSchema,
  useAs: SourceUseAsSchema,
  reportability: ReportabilitySchema,
  riskLevel: RiskLevelSchema,
  captureType: CaptureTypeSchema,
  status: CaptureStatusSchema,
  accessedAt: z.string().datetime(),
  capturedAt: z.string().datetime(),
  language: z.string().min(1),
  region: z.string().min(1),
  summary: z.string().min(1)
});

export const CollectionLogSchema = z.object({
  id: z.string().min(1),
  topicRunId: z.string().min(1),
  captureId: z.string().min(1).optional(),
  step: CollectionStepSchema,
  status: CollectionStatusSchema,
  message: z.string().min(1),
  createdAt: z.string().datetime()
});

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
  supportingCaptureIds: z.array(z.string().min(1)).min(1)
});

export const EvidenceSetSchema = z.object({
  id: z.string().min(1),
  topicRunId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z.array(EvidenceSchema).min(1)
});

export const ArtifactSchema = z.object({
  id: z.string().min(1),
  topicRunId: z.string().min(1),
  reportId: z.string().min(1).optional(),
  type: ArtifactTypeSchema,
  storage: z.enum(['memory', 'file']),
  uri: z.string().min(1),
  createdAt: z.string().datetime()
});

export const ReportClaimSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  statement: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1)
});

export const ReportSourceRefSchema = z.object({
  captureId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  sourceKind: SourceKindSchema,
  useAs: SourceUseAsSchema,
  reportability: ReportabilitySchema,
  riskLevel: RiskLevelSchema,
  lastCheckedAt: z.string().datetime()
});
```

Then extend `ReportSpecSchema` with `claims`, `sourceIndex`, and `updatedAt`, add `ReportViewSchema` with `report`, `evidenceSet`, `sourceCaptures`, and `collectionLogs`, and extend `CompilationResultSchema` with `topicRun`, `sourceCaptures`, `collectionLogs`, `evidenceSet`, and `artifacts`, including cross-object ID validation in `superRefine`.

- [ ] **Step 4: Re-run the contract test**

Run:

```powershell
pnpm test -- tests/contract/contracts-schema.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit the contract layer**

```powershell
git add packages/contracts/src/index.ts tests/contract/contracts-schema.test.ts
git commit -m "feat(contracts): define evidence-chain v1 schemas"
```

### Task 2: Add matching domain-model factories

**Files:**
- Modify: `packages/domain-models/src/index.ts`
- Test: `tests/contract/domain-models.test.ts`

- [ ] **Step 1: Write the failing domain-model test**

```ts
import { describe, expect, it } from 'vitest';
import {
  addEvidence,
  createArtifact,
  createCollectionLog,
  createEvidenceSet,
  createSourceCapture,
  createTopicRun
} from '@openfons/domain-models';

describe('@openfons/domain-models', () => {
  it('creates a topic run with the expected ids', () => {
    const topicRun = createTopicRun('opp_001', 'wf_001', 'ai-procurement');

    expect(topicRun.opportunityId).toBe('opp_001');
    expect(topicRun.workflowId).toBe('wf_001');
    expect(topicRun.topicKey).toBe('ai-procurement');
    expect(topicRun.status).toBe('planned');
  });

  it('creates captures, logs, evidence, and artifacts immutably', () => {
    const topicRun = createTopicRun('opp_001', 'wf_001', 'ai-procurement');
    const capture = createSourceCapture({
      topicRunId: topicRun.id,
      title: 'OpenAI API pricing',
      url: 'https://platform.openai.com/pricing',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'pricing-page',
      language: 'en',
      region: 'global',
      summary: 'Official pricing capture'
    });
    const log = createCollectionLog({
      topicRunId: topicRun.id,
      captureId: capture.id,
      step: 'capture',
      status: 'success',
      message: 'Captured pricing page.'
    });
    const initial = createEvidenceSet(topicRun.id);
    const next = addEvidence(initial, {
      id: 'evi_001',
      topicRunId: topicRun.id,
      captureId: capture.id,
      kind: 'pricing',
      statement: 'Official pricing must anchor comparisons.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote: 'Checked this run.',
      supportingCaptureIds: [capture.id]
    });
    const artifact = createArtifact(topicRun.id, 'report', 'memory://report/report_001', 'report_001');

    expect(log.captureId).toBe(capture.id);
    expect(initial.items).toHaveLength(0);
    expect(next.items).toHaveLength(1);
    expect(artifact.reportId).toBe('report_001');
  });
});
```

- [ ] **Step 2: Run the domain-model test to verify it fails**

Run:

```powershell
pnpm test -- tests/contract/domain-models.test.ts
```

Expected: FAIL with missing exports such as `createTopicRun`, `createSourceCapture`, or `createArtifact`.

- [ ] **Step 3: Implement the new factories**

```ts
export const createTopicRun = (
  opportunityId: string,
  workflowId: string,
  topicKey: string
) => ({
  id: createId('run'),
  opportunityId,
  workflowId,
  topicKey,
  status: 'planned' as const,
  startedAt: nowIso(),
  updatedAt: nowIso()
});

export const createSourceCapture = ({
  topicRunId,
  title,
  url,
  sourceKind,
  useAs,
  reportability,
  riskLevel,
  captureType,
  language,
  region,
  summary
}: {
  topicRunId: string;
  title: string;
  url: string;
  sourceKind: 'official' | 'community' | 'commercial' | 'inference';
  useAs: 'primary' | 'secondary' | 'corroboration' | 'discovery-only';
  reportability: 'reportable' | 'caveated' | 'blocked';
  riskLevel: 'low' | 'medium' | 'high';
  captureType: 'pricing-page' | 'availability-page' | 'doc-page' | 'community-thread' | 'analysis-note';
  language: string;
  region: string;
  summary: string;
}) => ({
  id: createId('cap'),
  topicRunId,
  title,
  url,
  sourceKind,
  useAs,
  reportability,
  riskLevel,
  captureType,
  status: 'captured' as const,
  accessedAt: nowIso(),
  capturedAt: nowIso(),
  language,
  region,
  summary
});

export const createCollectionLog = ({
  topicRunId,
  captureId,
  step,
  status,
  message
}: {
  topicRunId: string;
  captureId?: string;
  step: 'discover' | 'capture' | 'qualify' | 'compile';
  status: 'success' | 'warning' | 'error';
  message: string;
}) => ({
  id: createId('log'),
  topicRunId,
  captureId,
  step,
  status,
  message,
  createdAt: nowIso()
});

export const createArtifact = (
  topicRunId: string,
  type: 'opportunity' | 'topic-run' | 'evidence-set' | 'report',
  uri: string,
  reportId?: string
) => ({
  id: createId('art'),
  topicRunId,
  reportId,
  type,
  storage: 'memory' as const,
  uri,
  createdAt: nowIso()
});
```

Keep `createEvidenceSet()` and `addEvidence()` immutable, but update their types to match the richer evidence object.

- [ ] **Step 4: Re-run the domain-model test**

Run:

```powershell
pnpm test -- tests/contract/domain-models.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit the domain-model layer**

```powershell
git add packages/domain-models/src/index.ts tests/contract/domain-models.test.ts
git commit -m "feat(domain-models): add evidence-chain v1 factories"
```

### Task 3: Create the first deterministic AI procurement case bundle

**Files:**
- Create: `services/control-api/src/cases/ai-procurement.ts`
- Read: `docs/workbench/AI编程与Agent时代模型采购、路由、成本与地区选择系统案例.md`

- [ ] **Step 1: Create the case module with the first source capture set**

```ts
import type {
  Evidence,
  OpportunitySpec,
  SourceCapture,
  WorkflowSpec
} from '@openfons/contracts';
import {
  createCollectionLog,
  createEvidenceSet,
  createSourceCapture,
  createTopicRun
} from '@openfons/domain-models';
import { createId, nowIso } from '@openfons/shared';

export const AI_PROCUREMENT_CASE_KEY = 'ai-procurement-v1';

export const buildAiProcurementCase = (
  opportunity: OpportunitySpec,
  workflow: WorkflowSpec
) => {
  const topicRun = createTopicRun(opportunity.id, workflow.id, 'ai-procurement');

  const sourceCaptures: SourceCapture[] = [
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'OpenAI API pricing',
      url: 'https://platform.openai.com/pricing',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'pricing-page',
      language: 'en',
      region: 'global',
      summary: 'Official direct-provider pricing anchor.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'Google Gemini API pricing',
      url: 'https://ai.google.dev/gemini-api/docs/pricing',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'pricing-page',
      language: 'en',
      region: 'global',
      summary: 'Official Gemini pricing anchor.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'OpenRouter pricing',
      url: 'https://openrouter.ai/pricing',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'pricing-page',
      language: 'en',
      region: 'global',
      summary: 'Official relay-platform pricing input.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'OpenAI supported countries and territories',
      url: 'https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      captureType: 'availability-page',
      language: 'en',
      region: 'global',
      summary: 'Official region-availability reference.'
    }),
    createSourceCapture({
      topicRunId: topicRun.id,
      title: 'AI procurement workbench case memo',
      url: 'https://repo.local/docs/workbench/AI-case',
      sourceKind: 'inference',
      useAs: 'secondary',
      reportability: 'caveated',
      riskLevel: 'medium',
      captureType: 'analysis-note',
      language: 'zh-CN',
      region: 'global',
      summary: 'Curated internal reasoning summary for the first deterministic run.'
    })
  ];
```

The local memo URL is intentionally synthetic for the deterministic first run. Keep the external capture URLs official or relay-owned, and encode their risk/reportability rules directly in the capture objects.

- [ ] **Step 2: Add collection logs and evidence items**

```ts
  const collectionLogs = sourceCaptures.map((capture) =>
    createCollectionLog({
      topicRunId: topicRun.id,
      captureId: capture.id,
      step: 'capture',
      status: 'success',
      message: `Captured ${capture.title}`
    })
  );

  const evidenceSet = createEvidenceSet(topicRun.id);
  const evidenceItems: Evidence[] = [
    {
      id: createId('evi'),
      topicRunId: topicRun.id,
      captureId: sourceCaptures[0].id,
      kind: 'pricing',
      statement: 'Direct-provider pricing must be the baseline comparison frame.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote: 'Verified during the current run.',
      supportingCaptureIds: [sourceCaptures[0].id, sourceCaptures[1].id]
    },
    {
      id: createId('evi'),
      topicRunId: topicRun.id,
      captureId: sourceCaptures[2].id,
      kind: 'routing',
      statement: 'Relay platforms improve vendor coverage but need caveated treatment when comparing final cost.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'caveated',
      riskLevel: 'medium',
      freshnessNote: 'Relay prices can change outside direct-provider announcements.',
      supportingCaptureIds: [sourceCaptures[2].id]
    },
    {
      id: createId('evi'),
      topicRunId: topicRun.id,
      captureId: sourceCaptures[3].id,
      kind: 'availability',
      statement: 'Region availability must be handled as a first-class comparison field, not an afterthought.',
      sourceKind: 'official',
      useAs: 'primary',
      reportability: 'reportable',
      riskLevel: 'low',
      freshnessNote: 'Official region lists were checked during the run.',
      supportingCaptureIds: [sourceCaptures[3].id]
    }
  ];

  return {
    topicRun: {
      ...topicRun,
      status: 'compiled' as const,
      updatedAt: nowIso()
    },
    sourceCaptures,
    collectionLogs,
    evidenceSet: {
      ...evidenceSet,
      updatedAt: nowIso(),
      items: evidenceItems
    }
  };
};
```

- [ ] **Step 3: Commit the case seed**

```powershell
git add services/control-api/src/cases/ai-procurement.ts
git commit -m "feat(control-api): add first ai procurement evidence seed"
```

### Task 4: Compile and serve a report view bundle

**Files:**
- Modify: `services/control-api/src/compiler.ts`
- Modify: `services/control-api/src/store.ts`
- Modify: `services/control-api/src/app.ts`
- Modify: `apps/report-web/src/api.ts`
- Test: `tests/integration/control-api.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
it('compiles an opportunity into a report view backed by evidence', async () => {
  const app = createApp();

  const createResponse = await app.request('/api/v1/opportunities', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Direct API vs OpenRouter for AI Coding Teams',
      query: 'direct api vs openrouter',
      market: 'global',
      audience: 'small ai teams',
      problem: 'Teams need cheaper but reliable model procurement',
      outcome: 'Produce a source-backed report',
      geo: 'global',
      language: 'English'
    })
  });

  const created = await createResponse.json();
  const compileResponse = await app.request(
    `/api/v1/opportunities/${created.opportunity.id}/compile`,
    { method: 'POST' }
  );
  const compiled = await compileResponse.json();

  expect(compiled.topicRun.topicKey).toBe('ai-procurement');
  expect(compiled.sourceCaptures.length).toBeGreaterThan(0);
  expect(compiled.evidenceSet.items.length).toBeGreaterThan(0);
  expect(compiled.report.claims.length).toBeGreaterThan(0);

  const reportResponse = await app.request(`/api/v1/reports/${compiled.report.id}`);
  const reportView = await reportResponse.json();

  expect(reportView.report.id).toBe(compiled.report.id);
  expect(reportView.evidenceSet.id).toBe(compiled.evidenceSet.id);
  expect(reportView.sourceCaptures[0].title).toContain('pricing');
});
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run:

```powershell
pnpm test -- tests/integration/control-api.test.ts
```

Expected: FAIL because `compiled.topicRun`, `compiled.evidenceSet`, or `reportView.report` does not exist yet.

- [ ] **Step 3: Update `compiler.ts` to build the full chain**

```ts
import type {
  CompilationResult,
  OpportunityInput,
  OpportunitySpec,
  ReportSpec,
  TaskSpec,
  WorkflowSpec
} from '@openfons/contracts';
import { createArtifact } from '@openfons/domain-models';
import { createId, nowIso, slugify } from '@openfons/shared';
import { buildAiProcurementCase } from './cases/ai-procurement.js';

export const buildCompilation = (
  opportunity: OpportunitySpec
): CompilationResult => {
  const tasks: TaskSpec[] = [
    {
      id: createId('task'),
      opportunityId: opportunity.id,
      kind: 'collect-evidence',
      status: 'ready'
    },
    {
      id: createId('task'),
      opportunityId: opportunity.id,
      kind: 'score-opportunity',
      status: 'ready'
    },
    {
      id: createId('task'),
      opportunityId: opportunity.id,
      kind: 'render-report',
      status: 'ready'
    }
  ];

  const workflow: WorkflowSpec = {
    id: createId('wf'),
    opportunityId: opportunity.id,
    taskIds: tasks.map((task) => task.id),
    status: 'ready'
  };

  const caseBundle = buildAiProcurementCase(opportunity, workflow);
  const reportCreatedAt = nowIso();
  const report: ReportSpec = {
    id: createId('report'),
    opportunityId: opportunity.id,
    slug: opportunity.pageCandidates[0].slug,
    title: opportunity.pageCandidates[0].title,
    summary: 'First evidence-backed AI procurement report.',
    audience: opportunity.audience,
    geo: opportunity.geo,
    language: opportunity.language,
    thesis:
      'Start from official provider pricing and availability, then caveat relay convenience versus direct compliance certainty.',
    claims: [
      {
        id: 'claim_direct_anchor',
        label: 'Official direct-buy baseline',
        statement:
          'Direct provider pricing must anchor comparisons before any relay premium or convenience claim.',
        evidenceIds: [caseBundle.evidenceSet.items[0].id]
      },
      {
        id: 'claim_region_first',
        label: 'Region is not optional',
        statement:
          'Country availability and language support can change the best procurement path even when headline price looks cheaper elsewhere.',
        evidenceIds: [caseBundle.evidenceSet.items[2].id]
      }
    ],
    sourceIndex: caseBundle.sourceCaptures.map((capture) => ({
      captureId: capture.id,
      title: capture.title,
      url: capture.url,
      sourceKind: capture.sourceKind,
      useAs: capture.useAs,
      reportability: capture.reportability,
      riskLevel: capture.riskLevel,
      lastCheckedAt: capture.accessedAt
    })),
    sections: [
      {
        id: createId('sec'),
        title: 'Quick Answer',
        body: 'Use official pricing and availability pages to set the baseline, then caveat relay convenience and community pain points.'
      },
      {
        id: createId('sec'),
        title: 'Evidence Scope',
        body: 'This first run covers provider pricing, relay pricing, and official region availability only.'
      }
    ],
    evidenceBoundaries: [
      'Do not publish pricing claims without at least one official pricing capture.',
      'Relay comparisons must preserve caveats when source terms come from relay-owned pages.'
    ],
    risks: [
      'A deterministic first run can prove the chain shape, but it does not replace later live collection.',
      'Community pain points may corroborate workflow friction, but they do not override official pricing or availability.'
    ],
    updateLog: [
      {
        at: reportCreatedAt,
        note: 'Initial AI procurement evidence-backed report compiled.'
      }
    ],
    createdAt: reportCreatedAt,
    updatedAt: reportCreatedAt
  };

  const artifacts = [
    createArtifact(caseBundle.topicRun.id, 'report', `memory://report/${report.id}`, report.id)
  ];

  return {
    opportunity: {
      ...opportunity,
      status: 'compiled'
    },
    tasks,
    workflow,
    topicRun: caseBundle.topicRun,
    sourceCaptures: caseBundle.sourceCaptures,
    collectionLogs: caseBundle.collectionLogs,
    evidenceSet: caseBundle.evidenceSet,
    report,
    artifacts
  };
};
```

- [ ] **Step 4: Update `store.ts`, `app.ts`, and `api.ts` for `ReportView`**

```ts
// services/control-api/src/store.ts
import type {
  CompilationResult,
  OpportunitySpec,
  ReportView
} from '@openfons/contracts';

export type MemoryStore = {
  getOpportunity: (id: string) => OpportunitySpec | undefined;
  saveOpportunity: (opportunity: OpportunitySpec) => void;
  saveCompilation: (result: CompilationResult) => void;
  getReportView: (reportId: string) => ReportView | undefined;
};

const reportViews = new Map<string, ReportView>();

saveCompilation: (result) => {
  opportunities.set(result.opportunity.id, result.opportunity);
reportViews.set(result.report.id, {
  report: result.report,
  evidenceSet: result.evidenceSet,
  sourceCaptures: result.sourceCaptures,
  collectionLogs: result.collectionLogs
});
},
getReportView: (reportId) => reportViews.get(reportId)
```

```ts
// services/control-api/src/app.ts
app.get('/api/v1/reports/:reportId', (c) => {
  const reportView = store.getReportView(c.req.param('reportId'));

  if (!reportView) {
    throw new HTTPException(404, {
      message: 'Report not found'
    });
  }

  return c.json(reportView);
});
```

```ts
// apps/report-web/src/api.ts
import type { ReportView } from '@openfons/contracts';

export type ReportLoader = (reportId: string) => Promise<ReportView>;

export const createReportLoader = (baseUrl: string): ReportLoader => {
  return async (reportId) => {
    const response = await fetch(`${baseUrl}/api/v1/reports/${reportId}`);

    if (!response.ok) {
      throw new Error('Failed to load report');
    }

    return (await response.json()) as ReportView;
  };
};
```

- [ ] **Step 5: Re-run the integration test**

Run:

```powershell
pnpm test -- tests/integration/control-api.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit the runtime chain**

```powershell
git add services/control-api/src/cases/ai-procurement.ts services/control-api/src/compiler.ts services/control-api/src/store.ts services/control-api/src/app.ts apps/report-web/src/api.ts tests/integration/control-api.test.ts
git commit -m "feat(control-api): compile and serve ai procurement report view"
```

### Task 5: Render claims, sources, and risk boundaries in report-web

**Files:**
- Modify: `apps/report-web/src/pages/report-page.tsx`
- Modify: `apps/report-web/src/styles.css`
- Test: `tests/smoke/report-web.test.tsx`

- [ ] **Step 1: Write the failing smoke test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ReportPage } from '../../apps/report-web/src/pages/report-page';

describe('report-web', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders evidence-backed claims and sources from a report view', async () => {
    render(
      <ReportPage
        reportId="report_001"
        loadReport={async () => ({
          report: {
            id: 'report_001',
            opportunityId: 'opp_001',
            slug: 'direct-api-vs-openrouter-ai-coding',
            title: 'Direct API vs OpenRouter for AI Coding Teams',
            summary: 'A source-backed comparison for the first AI procurement run.',
            audience: 'small ai teams',
            geo: 'global',
            language: 'English',
            thesis: 'Use direct providers when compliance matters most.',
            claims: [
              {
                id: 'claim_001',
                label: 'Official direct-buy baseline',
                statement: 'Direct provider pricing must anchor comparisons.',
                evidenceIds: ['evi_001']
              }
            ],
            sourceIndex: [
              {
                captureId: 'cap_001',
                title: 'OpenAI API pricing',
                url: 'https://platform.openai.com/pricing',
                sourceKind: 'official',
                useAs: 'primary',
                reportability: 'reportable',
                riskLevel: 'low',
                lastCheckedAt: '2026-03-30T08:00:00.000Z'
              }
            ],
            sections: [
              {
                id: 'sec_001',
                title: 'Quick Answer',
                body: 'Start from official provider pricing and availability pages.'
              }
            ],
            evidenceBoundaries: ['Do not publish pricing claims without official pricing captures.'],
            risks: ['Community pain points do not override official pricing.'],
            updateLog: [
              {
                at: '2026-03-30T08:10:00.000Z',
                note: 'Initial AI procurement evidence-backed report compiled.'
              }
            ],
            createdAt: '2026-03-30T08:10:00.000Z',
            updatedAt: '2026-03-30T08:10:00.000Z'
          },
          evidenceSet: {
            id: 'es_001',
            topicRunId: 'run_001',
            createdAt: '2026-03-30T08:05:00.000Z',
            updatedAt: '2026-03-30T08:10:00.000Z',
            items: [
              {
                id: 'evi_001',
                topicRunId: 'run_001',
                captureId: 'cap_001',
                kind: 'pricing',
                statement: 'Official provider pricing must be the comparison anchor.',
                sourceKind: 'official',
                useAs: 'primary',
                reportability: 'reportable',
                riskLevel: 'low',
                freshnessNote: 'Verified during the current run.',
                supportingCaptureIds: ['cap_001']
              }
            ]
          },
          sourceCaptures: [
            {
              id: 'cap_001',
              topicRunId: 'run_001',
              title: 'OpenAI API pricing',
              url: 'https://platform.openai.com/pricing',
              sourceKind: 'official',
              useAs: 'primary',
              reportability: 'reportable',
              riskLevel: 'low',
              captureType: 'pricing-page',
              status: 'captured',
              accessedAt: '2026-03-30T08:00:00.000Z',
              capturedAt: '2026-03-30T08:00:00.000Z',
              language: 'en',
              region: 'global',
              summary: 'Provider pricing page capture'
            }
          ],
          collectionLogs: [
            {
              id: 'log_001',
              topicRunId: 'run_001',
              captureId: 'cap_001',
              step: 'capture',
              status: 'success',
              message: 'Captured OpenAI API pricing.',
              createdAt: '2026-03-30T08:00:00.000Z'
            }
          ]
        })}
      />
    );

    expect(await screen.findByText('Official direct-buy baseline')).toBeInTheDocument();
    expect(screen.getByText('OpenAI API pricing')).toBeInTheDocument();
    expect(screen.getByText('Do not publish pricing claims without official pricing captures.')).toBeInTheDocument();
    expect(screen.getByText('Initial AI procurement evidence-backed report compiled.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the smoke test to verify it fails**

Run:

```powershell
pnpm test -- tests/smoke/report-web.test.tsx
```

Expected: FAIL because `ReportPage` still expects raw `ReportSpec` and does not render `claims` or `sourceIndex`.

- [ ] **Step 3: Update the page component**

```tsx
import { useEffect, useState } from 'react';
import type { ReportView } from '@openfons/contracts';
import { createReportLoader, type ReportLoader } from '../api';

export const ReportPage = ({
  reportId,
  loadReport = createReportLoader(
    (
      import.meta as ImportMeta & {
        env: Record<string, string | undefined>;
      }
    ).env.VITE_CONTROL_API_BASE_URL ?? 'http://localhost:3001'
  )
}: Props) => {
  const [reportView, setReportView] = useState<ReportView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadReport(reportId)
      .then((next) => {
        if (!cancelled) {
          setReportView(next);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unknown error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadReport, reportId]);

  if (error) {
    return <p className="page-shell">{error}</p>;
  }

  if (!reportView) {
    return <p className="page-shell">Loading report...</p>;
  }

  const { report, evidenceSet, sourceCaptures, collectionLogs } = reportView;

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">OpenFons Evidence-Backed Report</p>
        <h1>{report.title}</h1>
        <p className="meta-line">
          {report.audience} / {report.geo} / {report.language}
        </p>
        <p>{report.summary}</p>
        <p className="thesis">{report.thesis}</p>
        <p className="meta-line">Updated: {report.updatedAt}</p>
      </section>

      <section className="section-card">
        <h2>Claims</h2>
        <ul className="detail-list">
          {report.claims.map((claim) => (
            <li key={claim.id}>
              <strong>{claim.label}</strong>: {claim.statement} (Evidence: {claim.evidenceIds.join(', ')})
            </li>
          ))}
        </ul>
      </section>

      <section className="section-card">
        <h2>Sources</h2>
        <ul className="detail-list">
          {report.sourceIndex.map((source) => (
            <li key={source.captureId}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>{' '}
              - {source.sourceKind} / {source.useAs} / {source.reportability} / {source.riskLevel}
            </li>
          ))}
        </ul>
      </section>

      <section className="section-card">
        <h2>Evidence</h2>
        <ul className="detail-list">
          {evidenceSet.items.map((item) => (
            <li key={item.id}>
              <strong>{item.kind}</strong>: {item.statement}
            </li>
          ))}
        </ul>
      </section>

      <section className="section-card">
        <h2>Capture Log</h2>
        <ul className="detail-list">
          {collectionLogs.map((log) => (
            <li key={log.id}>
              {log.step} / {log.status} - {log.message}
            </li>
          ))}
        </ul>
      </section>
```

Keep the existing sections, risk list, and update log below these new sections so the page still reads like a report, not just a raw evidence dump.

- [ ] **Step 4: Add the supporting styles**

```css
.detail-list {
  display: grid;
  gap: 0.85rem;
  padding-left: 1.25rem;
}

.detail-list li {
  line-height: 1.55;
}

.meta-line {
  color: #556070;
  font-size: 0.95rem;
}

.section-card a {
  color: #0b5cff;
  text-decoration: none;
}

.section-card a:hover {
  text-decoration: underline;
}
```

- [ ] **Step 5: Re-run the smoke test**

Run:

```powershell
pnpm test -- tests/smoke/report-web.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit the report-web update**

```powershell
git add apps/report-web/src/api.ts apps/report-web/src/pages/report-page.tsx apps/report-web/src/styles.css tests/smoke/report-web.test.tsx
git commit -m "feat(report-web): render evidence-backed report view"
```

### Task 6: Run the full verification sweep

**Files:**
- Modify: none
- Test: `tests/contract/contracts-schema.test.ts`
- Test: `tests/contract/domain-models.test.ts`
- Test: `tests/integration/control-api.test.ts`
- Test: `tests/smoke/report-web.test.tsx`

- [ ] **Step 1: Run the focused test suite**

Run:

```powershell
pnpm test -- tests/contract/contracts-schema.test.ts tests/contract/domain-models.test.ts tests/integration/control-api.test.ts tests/smoke/report-web.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run the full repo verification**

Run:

```powershell
pnpm check
```

Expected: PASS with lint, typecheck, test, and build all succeeding.

- [ ] **Step 3: Commit the verified branch tip**

```powershell
git add packages/contracts/src/index.ts packages/domain-models/src/index.ts services/control-api/src/cases/ai-procurement.ts services/control-api/src/compiler.ts services/control-api/src/store.ts services/control-api/src/app.ts apps/report-web/src/api.ts apps/report-web/src/pages/report-page.tsx apps/report-web/src/styles.css tests/contract/contracts-schema.test.ts tests/contract/domain-models.test.ts tests/integration/control-api.test.ts tests/smoke/report-web.test.tsx
git commit -m "feat(openfons): ship the first ai procurement evidence chain"
```

## Self-Review

### Spec coverage

- Missing-plan gap: covered outside this plan by creating this file and updating the active Memory todo.
- Freeze v1 schema: covered by Task 1 and Task 2.
- First runtime chain: covered by Task 3 and Task 4.
- First real case `AI procurement`: covered by Task 3 and Task 4.
- Upgrade `report-web`: covered by Task 5.
- Defer persistence and `OpenClaw`: preserved by architecture scope and by not touching database or second-case files.

### Placeholder scan

- No `TODO`, `TBD`, or "implement later" markers remain.
- Every task names exact files and exact commands.
- Each code step includes concrete snippets instead of abstract reminders.

### Type consistency

- `ReportView` is the same contract name in contracts, store, API loader, and report page.
- `sourceIndex`, `claims`, `topicRun`, `sourceCaptures`, `collectionLogs`, `evidenceSet`, and `artifacts` use the same names across contract, compiler, and tests.
- `reportability` uses `reportable | caveated | blocked` everywhere in the plan.
