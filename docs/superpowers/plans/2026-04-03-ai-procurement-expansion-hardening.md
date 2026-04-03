# AI Procurement Expansion Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the first `AI procurement` case from one fixed comparison into a bounded intake family with explicit policy gates, evidence validation, and operator-visible failure modes.

**Architecture:** Keep the existing `OpportunitySpec -> CompilationResult -> ReportSpec` chain intact, but insert a policy layer in front of compile and an evidence validator before report assembly. Drive capture targets from intake-family profiles instead of one global fixed list, then surface structured policy failures through `control-api` and the thin `control-web` client without introducing persistence or authenticated capture yet.

**Tech Stack:** TypeScript, Zod, Hono, React, Vitest, pnpm

---

## Scope Note

This plan intentionally implements **Phase A only** from the design spec. `Persistence` and `OpenClaw` remain deferred until the live system shows the trigger conditions described in [2026-04-03-ai-procurement-expansion-strategy-design.md](../specs/2026-04-03-ai-procurement-expansion-strategy-design.md).

## File Map

- Modify: `packages/contracts/src/index.ts`
  Add a shared API error schema and compile-policy code enum so backend and frontend agree on failure categories.
- Create: `services/control-api/src/cases/ai-procurement-intake.ts`
  Centralize accepted intake families, unsupported categories, and policy-message formatting.
- Create: `services/control-api/src/cases/ai-procurement-profiles.ts`
  Hold family-specific capture targets, report framing, and evidence requirement profiles.
- Create: `services/control-api/src/cases/ai-procurement-evidence.ts`
  Validate the evidence mix before report assembly.
- Modify: `services/control-api/src/cases/ai-procurement.ts`
  Replace the single hard-coded capture bundle with profile-driven target and evidence assembly.
- Modify: `services/control-api/src/collection/real-collection-bridge.ts`
  Resolve capture targets from the intake profile instead of the single global list.
- Modify: `services/control-api/src/compiler.ts`
  Insert policy classification before compile and evidence validation after collection.
- Modify: `services/control-api/src/app.ts`
  Return structured API errors with stable policy codes and status codes.
- Modify: `apps/control-web/src/api.ts`
  Parse structured API errors and preserve policy code + message.
- Modify: `apps/control-web/src/pages/opportunity-page.tsx`
  Communicate supported `AI procurement` question shapes and show more actionable failure guidance.
- Create: `tests/integration/ai-procurement-intake.test.ts`
  Cover intake-family classification and unsupported reasons.
- Modify: `tests/integration/ai-procurement-case.test.ts`
  Cover profile-driven capture-target selection for multiple supported families.
- Modify: `tests/integration/real-collection-bridge.test.ts`
  Ensure the bridge follows profile-derived targets.
- Modify: `tests/integration/control-api.test.ts`
  Cover structured 409/422 failures and successful compile behavior.
- Modify: `tests/smoke/control-web.test.tsx`
  Cover policy error parsing and updated page guidance.
- Modify: `tests/contract/contracts-schema.test.ts`
  Cover new shared API error and policy-code schemas.

---

### Task 1: Add intake-family policy and shared compile-error contracts

**Files:**
- Modify: `packages/contracts/src/index.ts`
- Create: `services/control-api/src/cases/ai-procurement-intake.ts`
- Modify: `services/control-api/src/compiler.ts`
- Create: `tests/integration/ai-procurement-intake.test.ts`
- Modify: `tests/contract/contracts-schema.test.ts`

- [ ] **Step 1: Write the failing contract and intake-policy tests**

```ts
// tests/integration/ai-procurement-intake.test.ts
import { describe, expect, it } from 'vitest';
import { buildOpportunity } from '../../services/control-api/src/compiler.js';
import {
  classifyAiProcurementOpportunity,
  formatAiProcurementPolicyMessage
} from '../../services/control-api/src/cases/ai-procurement-intake.js';

describe('ai procurement intake policy', () => {
  it('classifies vendor-choice procurement inputs as supported', () => {
    const opportunity = buildOpportunity({
      title: 'OpenAI API vs OpenRouter for AI Coding Teams',
      query: 'openai api vs openrouter for ai coding teams',
      market: 'global',
      audience: 'engineering leads',
      problem: 'Need to compare direct provider buying against relay routing',
      outcome: 'Choose the safer procurement path',
      geo: 'global',
      language: 'English'
    });

    expect(classifyAiProcurementOpportunity(opportunity)).toMatchObject({
      supported: true,
      family: 'vendor-choice'
    });
  });

  it('rejects non-ai-procurement inputs with an explicit category', () => {
    const opportunity = buildOpportunity({
      title: 'Best CRM for Dental Clinics',
      query: 'best crm for dental clinics',
      market: 'us',
      audience: 'dental clinic owners',
      problem: 'Need to compare CRM vendors',
      outcome: 'Choose a clinic CRM',
      geo: 'US',
      language: 'English'
    });

    const result = classifyAiProcurementOpportunity(opportunity);
    expect(result).toMatchObject({
      supported: false,
      reason: 'out_of_scope_domain'
    });
    expect(formatAiProcurementPolicyMessage(result)).toContain('AI procurement');
  });

  it('rejects vague AI topics that do not express a buyer decision', () => {
    const opportunity = buildOpportunity({
      title: 'Best AI Models',
      query: 'best ai models',
      market: 'global',
      audience: 'builders',
      problem: 'Need to know what is popular',
      outcome: 'Learn what models exist',
      geo: 'global',
      language: 'English'
    });

    expect(classifyAiProcurementOpportunity(opportunity)).toMatchObject({
      supported: false,
      reason: 'underspecified_buyer_decision'
    });
  });
});
```

```ts
// tests/contract/contracts-schema.test.ts
import {
  ApiErrorSchema,
  CompilationPolicyCodeSchema
} from '@openfons/contracts';

it('parses shared compile policy error bodies', () => {
  expect(CompilationPolicyCodeSchema.parse('out_of_scope_domain')).toBe(
    'out_of_scope_domain'
  );

  expect(
    ApiErrorSchema.parse({
      code: 'insufficient_public_evidence',
      message: 'Need at least one official source family before compile.'
    })
  ).toMatchObject({
    code: 'insufficient_public_evidence'
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `pnpm exec vitest run tests/contract/contracts-schema.test.ts tests/integration/ai-procurement-intake.test.ts`

Expected: FAIL because `ApiErrorSchema`, `CompilationPolicyCodeSchema`, and `classifyAiProcurementOpportunity()` do not exist yet.

- [ ] **Step 3: Add the shared contract types and intake classifier**

```ts
// packages/contracts/src/index.ts
export const CompilationPolicyCodeSchema = z.enum([
  'out_of_scope_domain',
  'missing_official_targets',
  'insufficient_public_evidence',
  'needs_authenticated_capture',
  'underspecified_buyer_decision'
]);

export const ApiErrorSchema = z.object({
  code: CompilationPolicyCodeSchema.optional(),
  message: z.string().min(1)
});

export type CompilationPolicyCode = z.infer<typeof CompilationPolicyCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
```

```ts
// services/control-api/src/cases/ai-procurement-intake.ts
import type { CompilationPolicyCode, OpportunitySpec } from '@openfons/contracts';

export type AiProcurementFamily =
  | 'vendor-choice'
  | 'pricing-access'
  | 'capability-procurement';

export type AiProcurementPolicyResult =
  | { supported: true; family: AiProcurementFamily }
  | { supported: false; reason: CompilationPolicyCode };

const PROCUREMENT_TERMS = ['api', 'pricing', 'billing', 'vendor', 'router', 'model'];

export const classifyAiProcurementOpportunity = (
  opportunity: OpportunitySpec
): AiProcurementPolicyResult => {
  const haystack = [
    opportunity.title,
    opportunity.input.query,
    opportunity.input.problem,
    opportunity.input.outcome
  ]
    .join(' ')
    .toLowerCase();

  if (!haystack.includes('ai') && !haystack.includes('model') && !haystack.includes('api')) {
    return { supported: false, reason: 'out_of_scope_domain' };
  }

  if (!PROCUREMENT_TERMS.some((term) => haystack.includes(term))) {
    return { supported: false, reason: 'underspecified_buyer_decision' };
  }

  if (haystack.includes('price') || haystack.includes('billing') || haystack.includes('credit')) {
    return { supported: true, family: 'pricing-access' };
  }

  if (haystack.includes('availability') || haystack.includes('rate limit')) {
    return { supported: true, family: 'capability-procurement' };
  }

  return { supported: true, family: 'vendor-choice' };
};

export const formatAiProcurementPolicyMessage = (
  result: Extract<AiProcurementPolicyResult, { supported: false }>
) => {
  switch (result.reason) {
    case 'out_of_scope_domain':
      return 'Only bounded AI procurement decisions are supported in the current compile path.';
    case 'underspecified_buyer_decision':
      return 'The request must express a concrete AI procurement decision such as vendor choice, pricing access, or capability access.';
    default:
      return 'The current AI procurement compile policy rejected this request.';
  }
};
```

- [ ] **Step 4: Wire compiler policy checks before compile starts**

```ts
// services/control-api/src/compiler.ts
import {
  classifyAiProcurementOpportunity,
  formatAiProcurementPolicyMessage
} from './cases/ai-procurement-intake.js';

export class CompilationPolicyError extends Error {
  constructor(
    readonly code: CompilationPolicyCode,
    readonly status: 409 | 422,
    message: string
  ) {
    super(message);
    this.name = 'CompilationPolicyError';
  }
}

const policy = classifyAiProcurementOpportunity(opportunity);
if (!policy.supported) {
  throw new CompilationPolicyError(
    policy.reason,
    409,
    formatAiProcurementPolicyMessage(policy)
  );
}
```

- [ ] **Step 5: Re-run the policy tests**

Run: `pnpm exec vitest run tests/contract/contracts-schema.test.ts tests/integration/ai-procurement-intake.test.ts`

Expected: PASS with the new policy enum, shared API error schema, and intake classifier.

- [ ] **Step 6: Commit the policy foundation**

```bash
git add packages/contracts/src/index.ts \
  services/control-api/src/cases/ai-procurement-intake.ts \
  services/control-api/src/compiler.ts \
  tests/contract/contracts-schema.test.ts \
  tests/integration/ai-procurement-intake.test.ts
git commit -m "feat(control-api): add ai procurement intake policy"
```

### Task 2: Refactor the case bundle around family-specific profiles

**Files:**
- Create: `services/control-api/src/cases/ai-procurement-profiles.ts`
- Modify: `services/control-api/src/cases/ai-procurement.ts`
- Modify: `services/control-api/src/collection/real-collection-bridge.ts`
- Modify: `tests/integration/ai-procurement-case.test.ts`
- Modify: `tests/integration/real-collection-bridge.test.ts`

- [ ] **Step 1: Write the failing profile tests**

```ts
// tests/integration/ai-procurement-case.test.ts
import { describe, expect, it } from 'vitest';
import type { OpportunitySpec, WorkflowSpec } from '@openfons/contracts';
import {
  buildAiProcurementCase,
  resolveAiProcurementProfileForOpportunity
} from '../../services/control-api/src/cases/ai-procurement.js';

const workflow: WorkflowSpec = {
  id: 'wf_001',
  opportunityId: 'opp_001',
  taskIds: ['task_001', 'task_002', 'task_003'],
  status: 'ready'
};

describe('ai procurement profiles', () => {
  it('uses the pricing-access profile for billing questions', () => {
    const opportunity = {
      id: 'opp_001',
      slug: 'openai-vs-openrouter-pricing-for-startups',
      title: 'OpenAI vs OpenRouter Pricing for Startups',
      market: 'global',
      input: {
        title: 'OpenAI vs OpenRouter Pricing for Startups',
        query: 'openai vs openrouter pricing for startups',
        market: 'global',
        audience: 'startup founders',
        problem: 'Need to compare pricing, credits, and billing predictability',
        outcome: 'Choose the cheaper procurement path',
        geo: 'global',
        language: 'English'
      },
      status: 'draft',
      createdAt: '2026-04-03T00:00:00.000Z',
      audience: 'startup founders',
      geo: 'global',
      language: 'English',
      searchIntent: 'decision',
      angle: 'Compare AI API pricing and billing models',
      firstDeliverySurface: 'report-web',
      pageCandidates: [
        {
          slug: 'openai-vs-openrouter-pricing-for-startups',
          title: 'OpenAI vs OpenRouter Pricing for Startups',
          query: 'openai vs openrouter pricing for startups'
        }
      ],
      evidenceRequirements: [
        { kind: 'official-pricing', note: 'Capture official pricing pages.' }
      ],
      productOpportunityHints: []
    } satisfies OpportunitySpec;

    const profile = resolveAiProcurementProfileForOpportunity(opportunity);
    const bundle = buildAiProcurementCase(opportunity, workflow);

    expect(profile.family).toBe('pricing-access');
    expect(bundle.sourceCaptures.some((capture) => capture.captureType === 'pricing-page')).toBe(true);
    expect(bundle.sourceCaptures.some((capture) => capture.sourceKind === 'community')).toBe(true);
  });
});
```

```ts
// tests/integration/real-collection-bridge.test.ts
it('queries the profile-derived target set instead of a global fixed list', async () => {
  const opportunity = buildOpportunity({
    title: 'OpenAI Availability and Rate Limit Access for APAC Teams',
    query: 'openai availability and rate limit access for apac teams',
    market: 'apac',
    audience: 'platform teams',
    problem: 'Need to know whether a public API path is available in-region',
    outcome: 'Choose a compliant procurement path',
    geo: 'APAC',
    language: 'English'
  });

  const seenQueries: string[] = [];
  const profileTargets = resolveAiProcurementProfileForOpportunity(opportunity).captureTargets;
  const bridge = createAiProcurementRealCollectionBridge({
    searchClient: {
      search: async (request) => {
        seenQueries.push(request.query);
        const target = profileTargets.find((item) => item.query === request.query)!;
        return createSearchRunResult(target);
      }
    },
    captureRunner: async (plans) => createCaptureRunnerResult(plans)
  });

  await buildCompilation(opportunity, { buildAiProcurementCaseBundle: bridge });

  expect(seenQueries.some((query) => query.includes('supported countries'))).toBe(true);
});
```

- [ ] **Step 2: Run the profile tests to verify they fail**

Run: `pnpm exec vitest run tests/integration/ai-procurement-case.test.ts tests/integration/real-collection-bridge.test.ts`

Expected: FAIL because `resolveAiProcurementProfileForOpportunity()` and profile-driven target resolution do not exist yet.

- [ ] **Step 3: Create family-specific profiles and case helpers**

```ts
// services/control-api/src/cases/ai-procurement-profiles.ts
import type { OpportunitySpec, SourceCapture } from '@openfons/contracts';
import type { AiProcurementFamily } from './ai-procurement-intake.js';

export type AiProcurementCaptureTarget = {
  key: string;
  title: string;
  query: string;
  url: string;
  urlPattern: RegExp;
  sourceKind: SourceCapture['sourceKind'];
  useAs: SourceCapture['useAs'];
  reportability: SourceCapture['reportability'];
  riskLevel: SourceCapture['riskLevel'];
  captureType: SourceCapture['captureType'];
  language: string;
  region: string;
  summary: string;
};

export type AiProcurementProfile = {
  family: AiProcurementFamily;
  summary: string;
  captureTargets: AiProcurementCaptureTarget[];
  evidenceBoundaries: string[];
};

export const resolveAiProcurementProfile = (
  opportunity: OpportunitySpec,
  family: AiProcurementFamily
): AiProcurementProfile => {
  switch (family) {
    case 'pricing-access':
      return {
        family,
        summary: 'Bounded pricing and billing comparison.',
        captureTargets: [
          {
            key: 'openai-pricing',
            title: 'OpenAI API pricing',
            query: 'site:openai.com openai api pricing',
            url: 'https://openai.com/api/pricing/',
            urlPattern: /^https:\/\/openai\.com\/api\/pricing\/?(?:\?[^#]*)?$/i,
            sourceKind: 'official',
            useAs: 'primary',
            reportability: 'reportable',
            riskLevel: 'low',
            captureType: 'pricing-page',
            language: 'en',
            region: 'global',
            summary: 'Official pricing page with current token-rate tables.'
          },
          {
            key: 'openrouter-pricing',
            title: 'OpenRouter pricing',
            query: 'site:openrouter.ai openrouter pricing',
            url: 'https://openrouter.ai/pricing',
            urlPattern: /^https:\/\/openrouter\.ai\/pricing\/?(?:\?[^#]*)?$/i,
            sourceKind: 'official',
            useAs: 'primary',
            reportability: 'caveated',
            riskLevel: 'medium',
            captureType: 'pricing-page',
            language: 'en',
            region: 'global',
            summary: 'Official relay pricing page for pass-through and model coverage.'
          },
          {
            key: 'openrouter-faq',
            title: 'OpenRouter FAQ',
            query: 'site:openrouter.ai openrouter faq byok fees',
            url: 'https://openrouter.ai/docs/faq',
            urlPattern: /^https:\/\/openrouter\.ai\/docs\/faq\/?(?:\?[^#]*)?$/i,
            sourceKind: 'official',
            useAs: 'secondary',
            reportability: 'caveated',
            riskLevel: 'medium',
            captureType: 'doc-page',
            language: 'en',
            region: 'global',
            summary: 'Official FAQ documenting billing caveats and BYOK fees.'
          },
          {
            key: 'openrouter-community',
            title: 'OpenRouter billing caveat community discussion',
            query: 'openrouter byok github issue',
            url: 'https://github.com/BerriAI/litellm/issues/11626',
            urlPattern:
              /^https:\/\/github\.com\/BerriAI\/litellm\/issues\/11626\/?(?:\?[^#]*)?$/i,
            sourceKind: 'community',
            useAs: 'corroboration',
            reportability: 'caveated',
            riskLevel: 'medium',
            captureType: 'community-thread',
            language: 'en',
            region: 'global',
            summary: 'Community corroboration for billing confusion and BYOK caveats.'
          }
        ],
        evidenceBoundaries: [
          'Do not publish pricing claims without an official pricing capture.'
        ]
      };
    case 'capability-procurement':
      return {
        family,
        summary: 'Bounded capability and access procurement report.',
        captureTargets: [
          {
            key: 'openai-availability',
            title: 'OpenAI API supported countries and territories',
            query: 'site:help.openai.com 5347006 openai api supported countries territories',
            url: 'https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories',
            urlPattern:
              /^https:\/\/help\.openai\.com\/[a-z-]+\/articles\/5347006-openai-api-supported-countries-and-territories\/?$/i,
            sourceKind: 'official',
            useAs: 'primary',
            reportability: 'reportable',
            riskLevel: 'low',
            captureType: 'availability-page',
            language: 'en',
            region: 'global',
            summary: 'Official regional availability and support boundary page.'
          },
          {
            key: 'gemini-pricing',
            title: 'Gemini Developer API billing',
            query: 'site:ai.google.dev gemini api pricing',
            url: 'https://ai.google.dev/gemini-api/docs/billing',
            urlPattern:
              /^https:\/\/ai\.google\.dev\/gemini-api\/docs\/billing(?:\?[^#]*)?\/?$/i,
            sourceKind: 'official',
            useAs: 'secondary',
            reportability: 'reportable',
            riskLevel: 'low',
            captureType: 'doc-page',
            language: 'en',
            region: 'global',
            summary: 'Official Gemini billing and plan-access documentation.'
          },
          {
            key: 'openrouter-community',
            title: 'OpenRouter billing caveat community discussion',
            query: 'openrouter byok github issue',
            url: 'https://github.com/BerriAI/litellm/issues/11626',
            urlPattern:
              /^https:\/\/github\.com\/BerriAI\/litellm\/issues\/11626\/?(?:\?[^#]*)?$/i,
            sourceKind: 'community',
            useAs: 'corroboration',
            reportability: 'caveated',
            riskLevel: 'medium',
            captureType: 'community-thread',
            language: 'en',
            region: 'global',
            summary: 'Community corroboration for operational friction around access and billing.'
          }
        ],
        evidenceBoundaries: [
          'Do not publish access claims without an official availability or docs capture.'
        ]
      };
    default:
      return {
        family,
        summary: 'Bounded vendor-choice procurement comparison.',
        captureTargets: [
          {
            key: 'openai-pricing',
            title: 'OpenAI API pricing',
            query: 'site:openai.com openai api pricing',
            url: 'https://openai.com/api/pricing/',
            urlPattern: /^https:\/\/openai\.com\/api\/pricing\/?(?:\?[^#]*)?$/i,
            sourceKind: 'official',
            useAs: 'primary',
            reportability: 'reportable',
            riskLevel: 'low',
            captureType: 'pricing-page',
            language: 'en',
            region: 'global',
            summary: 'Official direct-provider pricing baseline.'
          },
          {
            key: 'gemini-pricing',
            title: 'Gemini Developer API billing',
            query: 'site:ai.google.dev gemini api pricing',
            url: 'https://ai.google.dev/gemini-api/docs/billing',
            urlPattern:
              /^https:\/\/ai\.google\.dev\/gemini-api\/docs\/billing(?:\?[^#]*)?\/?$/i,
            sourceKind: 'official',
            useAs: 'primary',
            reportability: 'reportable',
            riskLevel: 'low',
            captureType: 'pricing-page',
            language: 'en',
            region: 'global',
            summary: 'Official alternative vendor pricing baseline.'
          },
          {
            key: 'openrouter-pricing',
            title: 'OpenRouter pricing',
            query: 'site:openrouter.ai openrouter pricing',
            url: 'https://openrouter.ai/pricing',
            urlPattern: /^https:\/\/openrouter\.ai\/pricing\/?(?:\?[^#]*)?$/i,
            sourceKind: 'official',
            useAs: 'primary',
            reportability: 'caveated',
            riskLevel: 'medium',
            captureType: 'pricing-page',
            language: 'en',
            region: 'global',
            summary: 'Official relay platform pricing and routing context.'
          },
          {
            key: 'openrouter-community',
            title: 'OpenRouter billing caveat community discussion',
            query: 'openrouter byok github issue',
            url: 'https://github.com/BerriAI/litellm/issues/11626',
            urlPattern:
              /^https:\/\/github\.com\/BerriAI\/litellm\/issues\/11626\/?(?:\?[^#]*)?$/i,
            sourceKind: 'community',
            useAs: 'corroboration',
            reportability: 'caveated',
            riskLevel: 'medium',
            captureType: 'community-thread',
            language: 'en',
            region: 'global',
            summary: 'Community corroboration for relay-platform caveats.'
          }
        ],
        evidenceBoundaries: [
          'Direct-provider pricing must anchor relay comparisons.'
        ]
      };
  }
};
```

```ts
// services/control-api/src/cases/ai-procurement.ts
import { classifyAiProcurementOpportunity } from './ai-procurement-intake.js';
import { resolveAiProcurementProfile } from './ai-procurement-profiles.js';

export const resolveAiProcurementProfileForOpportunity = (
  opportunity: OpportunitySpec
) => {
  const policy = classifyAiProcurementOpportunity(opportunity);
  if (!policy.supported) {
    throw new Error(`unsupported profile request: ${policy.reason}`);
  }
  return resolveAiProcurementProfile(opportunity, policy.family);
};

export const buildAiProcurementCase = (
  opportunity: OpportunitySpec,
  workflow: WorkflowSpec
) => {
  const topicRun = createTopicRun(opportunity.id, workflow.id, 'ai-procurement');
  const profile = resolveAiProcurementProfileForOpportunity(opportunity);
  const sourceCaptures = profile.captureTargets.map((target) =>
    createSourceCapture({
      topicRunId: topicRun.id,
      title: target.title,
      url: target.url,
      sourceKind: target.sourceKind,
      useAs: target.useAs,
      reportability: target.reportability,
      riskLevel: target.riskLevel,
      captureType: target.captureType,
      language: target.language,
      region: target.region,
      summary: target.summary
    })
  );
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
      items: buildEvidenceItems(topicRun.id, profile, sourceCaptures)
    }
  };
};
```

- [ ] **Step 4: Update the real bridge to use profile-derived targets**

```ts
// services/control-api/src/collection/real-collection-bridge.ts
import {
  resolveAiProcurementProfileForOpportunity
} from '../cases/ai-procurement.js';

const profile = resolveAiProcurementProfileForOpportunity(opportunity);

for (const [index, target] of profile.captureTargets.entries()) {
  const taskId = workflow.taskIds[index % workflow.taskIds.length];
  const searchRun = await searchClient.search(
    buildSearchRequest({
      projectId,
      opportunityId: opportunity.id,
      workflowId: workflow.id,
      taskId,
      query: target.query,
      geo: opportunity.geo,
      language: opportunity.language
    })
  );
  const selected = selectSearchResult(target, searchRun.results);
  if (!selected) {
    throw createRuntimeError(`no search result matched ${target.key}`, discoveryLogs);
  }
}
```

- [ ] **Step 5: Re-run the case and bridge tests**

Run: `pnpm exec vitest run tests/integration/ai-procurement-case.test.ts tests/integration/real-collection-bridge.test.ts`

Expected: PASS with family-specific targets and bridge queries.

- [ ] **Step 6: Commit the profile refactor**

```bash
git add services/control-api/src/cases/ai-procurement-profiles.ts \
  services/control-api/src/cases/ai-procurement.ts \
  services/control-api/src/collection/real-collection-bridge.ts \
  tests/integration/ai-procurement-case.test.ts \
  tests/integration/real-collection-bridge.test.ts
git commit -m "feat(control-api): drive ai procurement from intake profiles"
```

### Task 3: Enforce evidence mix gates and return structured API failures

**Files:**
- Create: `services/control-api/src/cases/ai-procurement-evidence.ts`
- Modify: `services/control-api/src/compiler.ts`
- Modify: `services/control-api/src/app.ts`
- Modify: `tests/integration/control-api.test.ts`

- [ ] **Step 1: Write the failing control-api tests**

```ts
// tests/integration/control-api.test.ts
it('returns a structured 409 policy error for out-of-scope requests', async () => {
  const app = createApp();

  const createResponse = await app.request('/api/v1/opportunities', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Best CRM for Dental Clinics',
      query: 'best crm for dental clinics',
      market: 'us',
      audience: 'dental clinic owners',
      problem: 'Need to compare CRM options',
      outcome: 'Choose a CRM',
      geo: 'US',
      language: 'English'
    })
  });
  const created = await createResponse.json();

  const compileResponse = await app.request(
    `/api/v1/opportunities/${created.opportunity.id}/compile`,
    { method: 'POST' }
  );

  expect(compileResponse.status).toBe(409);
  await expect(compileResponse.json()).resolves.toMatchObject({
    code: 'out_of_scope_domain'
  });
});

it('returns a structured 422 error when official evidence is missing', async () => {
  const app = createApp({
    buildAiProcurementCaseBundle: async (opportunity, workflow) => {
      const bundle = createRealBridgeBundle(opportunity, workflow);
      return {
        ...bundle,
        sourceCaptures: bundle.sourceCaptures.filter(
          (capture) => capture.sourceKind === 'community'
        ),
        evidenceSet: {
          ...bundle.evidenceSet,
          items: bundle.evidenceSet.items.filter(
            (item) => item.sourceKind === 'community'
          )
        }
      };
    }
  });

  const createResponse = await app.request('/api/v1/opportunities', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(createOpportunityInput())
  });
  const created = await createResponse.json();

  const compileResponse = await app.request(
    `/api/v1/opportunities/${created.opportunity.id}/compile`,
    { method: 'POST' }
  );

  expect(compileResponse.status).toBe(422);
  await expect(compileResponse.json()).resolves.toMatchObject({
    code: 'insufficient_public_evidence'
  });
});
```

- [ ] **Step 2: Run the control-api tests to verify they fail**

Run: `pnpm exec vitest run tests/integration/control-api.test.ts`

Expected: FAIL because compile errors still return plain text and there is no evidence validator.

- [ ] **Step 3: Add the evidence validator and policy-aware error flow**

```ts
// services/control-api/src/cases/ai-procurement-evidence.ts
import type { SourceCapture, EvidenceSet } from '@openfons/contracts';

export const validateAiProcurementEvidence = (input: {
  sourceCaptures: SourceCapture[];
  evidenceSet: EvidenceSet;
}) => {
  const officialCaptureCount = input.sourceCaptures.filter(
    (capture) => capture.sourceKind === 'official'
  ).length;
  const communityCaptureCount = input.sourceCaptures.filter(
    (capture) => capture.sourceKind === 'community'
  ).length;

  if (officialCaptureCount === 0) {
    return {
      valid: false,
      code: 'insufficient_public_evidence' as const,
      message: 'Need at least one official source family before compile.'
    };
  }

  if (communityCaptureCount === 0) {
    return {
      valid: false,
      code: 'insufficient_public_evidence' as const,
      message: 'Need at least one corroborating community source before compile.'
    };
  }

  return { valid: true as const };
};
```

```ts
// services/control-api/src/compiler.ts
import { validateAiProcurementEvidence } from './cases/ai-procurement-evidence.js';

const evidencePolicy = validateAiProcurementEvidence({
  sourceCaptures: caseBundle.sourceCaptures,
  evidenceSet: caseBundle.evidenceSet
});

if (!evidencePolicy.valid) {
  throw new CompilationPolicyError(
    evidencePolicy.code,
    422,
    evidencePolicy.message
  );
}
```

```ts
// services/control-api/src/app.ts
import { ApiErrorSchema } from '@openfons/contracts';
import { CompilationPolicyError } from './compiler.js';

if (error instanceof CompilationPolicyError) {
  return c.json(
    ApiErrorSchema.parse({
      code: error.code,
      message: error.message
    }),
    error.status
  );
}
```

- [ ] **Step 4: Re-run the control-api tests**

Run: `pnpm exec vitest run tests/integration/control-api.test.ts`

Expected: PASS with JSON policy errors for unsupported or under-evidenced inputs, and existing success cases still green.

- [ ] **Step 5: Commit the evidence and API error flow**

```bash
git add services/control-api/src/cases/ai-procurement-evidence.ts \
  services/control-api/src/compiler.ts \
  services/control-api/src/app.ts \
  tests/integration/control-api.test.ts
git commit -m "feat(control-api): enforce ai procurement evidence gates"
```

### Task 4: Align control-web with the bounded intake model

**Files:**
- Modify: `apps/control-web/src/api.ts`
- Modify: `apps/control-web/src/pages/opportunity-page.tsx`
- Modify: `tests/smoke/control-web.test.tsx`

- [ ] **Step 1: Write the failing control-web smoke tests**

```ts
// tests/smoke/control-web.test.tsx
import { ControlApiError, createControlApi } from '../../apps/control-web/src/api';

it('parses structured compile policy errors from control-api', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        code: 'out_of_scope_domain',
        message: 'Only bounded AI procurement decisions are supported in the current compile path.'
      }),
      {
        status: 409,
        headers: { 'content-type': 'application/json' }
      }
    )
  );

  const api = createControlApi('http://localhost:3001');

  await expect(api.compileOpportunity('opp_001')).rejects.toMatchObject({
    name: 'ControlApiError',
    code: 'out_of_scope_domain'
  });
});

it('shows supported AI procurement shapes on the page', () => {
  const mockApi = {
    createOpportunity: vi.fn(),
    compileOpportunity: vi.fn()
  };

  render(<OpportunityPage api={mockApi} />);

  expect(screen.getByText(/vendor choice/i)).toBeInTheDocument();
  expect(screen.getByText(/pricing and access/i)).toBeInTheDocument();
  expect(screen.getByText(/capability procurement/i)).toBeInTheDocument();
});

it('shows scoped guidance for policy failures', async () => {
  const createdOpportunity = {
    id: 'opp_001',
    slug: 'openai-api-vs-openrouter',
    title: 'OpenAI API vs OpenRouter',
    market: 'global',
    input: {
      title: 'OpenAI API vs OpenRouter',
      query: 'openai api vs openrouter',
      market: 'global',
      audience: 'engineering leads',
      problem: 'Need to compare direct provider buying against relay routing',
      outcome: 'Choose the safer procurement path',
      geo: 'global',
      language: 'English'
    },
    status: 'draft' as const,
    createdAt: '2026-04-03T00:00:00.000Z',
    audience: 'engineering leads',
    geo: 'global',
    language: 'English',
    searchIntent: 'decision' as const,
    angle: 'Compare direct provider buying against relay routing',
    firstDeliverySurface: 'report-web' as const,
    pageCandidates: [
      {
        slug: 'openai-api-vs-openrouter',
        title: 'OpenAI API vs OpenRouter',
        query: 'openai api vs openrouter'
      }
    ],
    evidenceRequirements: [
      {
        kind: 'official-pricing' as const,
        note: 'Capture official pricing pages.'
      }
    ],
    productOpportunityHints: []
  };

  const api = {
    createOpportunity: async () => createdOpportunity,
    compileOpportunity: async () => {
      throw new ControlApiError(
        'Only bounded AI procurement decisions are supported in the current compile path.',
        409,
        'out_of_scope_domain'
      );
    }
  };

  render(<OpportunityPage api={api} />);
  fireEvent.click(screen.getByRole('button', { name: /compile report shell/i }));

  expect(
    await screen.findByText(/try a vendor choice, pricing, or capability access question/i)
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the control-web smoke tests to verify they fail**

Run: `pnpm exec vitest run tests/smoke/control-web.test.tsx`

Expected: FAIL because the API client does not parse JSON policy errors and the page does not show bounded-intake guidance.

- [ ] **Step 3: Implement structured error parsing and bounded-intake guidance**

```ts
// apps/control-web/src/api.ts
import { ApiErrorSchema, type CompilationPolicyCode } from '@openfons/contracts';

export class ControlApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: CompilationPolicyCode
  ) {
    super(message);
    this.name = 'ControlApiError';
  }
}

const readApiError = async (response: Response, fallback: string) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const parsed = ApiErrorSchema.safeParse(await response.json());
    if (parsed.success) {
      return new ControlApiError(parsed.data.message, response.status, parsed.data.code);
    }
  }

  const message = (await response.text()).trim();
  return new ControlApiError(message || fallback, response.status);
};
```

```tsx
// apps/control-web/src/pages/opportunity-page.tsx
const scopeGuidance =
  error instanceof ControlApiError && error.code === 'out_of_scope_domain'
    ? 'Try a vendor choice, pricing, or capability access question inside AI procurement.'
    : null;

<p className="lede">
  Submit one bounded AI procurement question and compile a source-backed report.
</p>
<ul className="scope-list">
  <li>Vendor choice</li>
  <li>Pricing and access</li>
  <li>Capability procurement</li>
</ul>
{error ? <p className="error">{error.message}</p> : null}
{scopeGuidance ? <p className="hint">{scopeGuidance}</p> : null}
```

- [ ] **Step 4: Re-run the control-web smoke tests**

Run: `pnpm exec vitest run tests/smoke/control-web.test.tsx`

Expected: PASS with JSON error parsing, scoped page copy, and preserved report success flow.

- [ ] **Step 5: Commit the control-web alignment**

```bash
git add apps/control-web/src/api.ts \
  apps/control-web/src/pages/opportunity-page.tsx \
  tests/smoke/control-web.test.tsx
git commit -m "feat(control-web): surface ai procurement policy guidance"
```

---

## Verification Sweep

Run the focused suite first:

```bash
pnpm exec vitest run \
  tests/contract/contracts-schema.test.ts \
  tests/integration/ai-procurement-intake.test.ts \
  tests/integration/ai-procurement-case.test.ts \
  tests/integration/real-collection-bridge.test.ts \
  tests/integration/control-api.test.ts \
  tests/smoke/control-web.test.tsx
```

Then run repo-wide verification:

```bash
pnpm check
```

Finally, run one live smoke without `DDG_ENDPOINT` after `control-api` and `report-web` are up:

```powershell
$payload = @{
  title = 'OpenAI API vs OpenRouter for AI Coding Teams'
  query = 'openai api vs openrouter for ai coding teams'
  market = 'global'
  audience = 'engineering leads'
  problem = 'Need to compare direct provider buying against relay routing'
  outcome = 'Choose the safer procurement path'
  geo = 'global'
  language = 'English'
} | ConvertTo-Json

$create = Invoke-RestMethod `
  -Method Post `
  -Uri 'http://localhost:3001/api/v1/opportunities' `
  -ContentType 'application/json' `
  -Body $payload

$compiled = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3001/api/v1/opportunities/$($create.opportunity.id)/compile"

$report = Invoke-WebRequest `
  -Method Get `
  -Uri "http://localhost:3002/reports/$($compiled.report.id)"

@{
  compileStatus = if ($compiled.report.id) { 200 } else { 500 }
  reportStatus = $report.StatusCode
  sourceCaptureCount = $compiled.sourceCaptures.Count
  evidenceCount = $compiled.evidenceSet.items.Count
} | ConvertTo-Json
```

Expected:

- `compileStatus` is `200`
- `reportStatus` is `200`
- `sourceCaptureCount` is at least `4`
- `evidenceCount` is at least `4`
- no compile response is returned from deterministic fallback for the supported baseline
