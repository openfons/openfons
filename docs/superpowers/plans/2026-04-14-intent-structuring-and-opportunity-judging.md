# Intent Structuring And Opportunity Judging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class raw-question planning path that produces a judged `OpportunitySpec`, requires user confirmation before compilation, and preserves the current structured `OpportunityInput` compiler bridge for compatibility.

**Architecture:** Keep shared planning contracts in `@openfons/contracts`, implement deterministic v1 planning in `services/control-api/src/planning`, expose `/plan` and `/confirm` through `control-api`, and move `control-web` from a fully manual structured form to a raw-question review-and-confirm flow. Keep `search-gateway` reserved for a later planning discovery phase only; this plan does not wire live discovery, and `search-gateway` must not become the opportunity judge.

**Tech Stack:** TypeScript, Zod, Hono, React, Vitest, pnpm workspaces

---

Repository note: this repository forbids creating a dedicated git worktree. Execute this plan in the current workspace and do not add `.tmp/` to version control.

## Planned File Map

### Contracts

- Create: `packages/contracts/src/opportunity-planning.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `tests/contract/opportunity-planning-schema.test.ts`

### Control API Planning Core

- Create: `services/control-api/src/planning/intent-structuring.ts`
- Create: `services/control-api/src/planning/planning-swarm.ts`
- Create: `services/control-api/src/planning/opportunity-judge.ts`
- Create: `services/control-api/src/planning/pipeline.ts`
- Modify: `services/control-api/src/compiler.ts`
- Test: `tests/integration/opportunity-planning.test.ts`

### Control API Surface

- Modify: `services/control-api/src/app.ts`
- Modify: `services/control-api/src/store.ts` only if the current `saveOpportunity()` call site needs an explicit update helper
- Test: `tests/integration/control-api.test.ts`

### Control Web

- Modify: `apps/control-web/src/api.ts`
- Modify: `apps/control-web/src/pages/opportunity-page.tsx`
- Test: `tests/smoke/control-web.test.tsx`

### Planning Trace

- Create: `services/control-api/src/planning/trace.ts`
- Modify: `services/control-api/src/planning/signal-brief.ts`
- Test: `tests/integration/opportunity-planning.test.ts`

## Task 1: Add Planning Contracts

**Files:**
- Create: `packages/contracts/src/opportunity-planning.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `tests/contract/opportunity-planning-schema.test.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
import { describe, expect, it } from 'vitest';
import {
  ConfirmOpportunityRequestSchema,
  OpportunityPlanningBundleSchema,
  OpportunityQuestionSchema,
  OpportunitySpecSchema
} from '@openfons/contracts';

describe('@openfons/contracts opportunity planning schemas', () => {
  it('parses a raw question and a judged planning bundle inside OpportunitySpec', () => {
    const question = OpportunityQuestionSchema.parse({
      question:
        'Should a small AI team buy model APIs directly or use a routing provider?',
      geoHint: 'US',
      languageHint: 'English'
    });

    const planning = OpportunityPlanningBundleSchema.parse({
      question,
      intent: {
        keywordSeed: question.question,
        topic: 'AI coding model procurement',
        caseKey: 'ai-procurement',
        intentCandidates: ['procurement_decision', 'routing_decision'],
        audienceCandidates: ['small AI teams'],
        geoCandidates: ['US'],
        languageCandidates: ['English']
      },
      roleBriefs: [
        {
          role: 'opportunity-judge',
          summary: 'Direct API vs router is the clearest first decision page.',
          confidence: 'medium',
          keyFindings: ['Clear buyer decision'],
          openQuestions: ['Pricing must be validated with official sources'],
          signalFamilies: ['search', 'commercial']
        }
      ],
      options: [
        {
          id: 'option_direct_vs_router',
          primaryKeyword: 'direct API vs OpenRouter',
          angle: 'official direct purchase versus routing platform tradeoff',
          audience: 'small AI teams',
          geo: 'US',
          language: 'English',
          searchIntent: 'comparison',
          rationale: 'Strong procurement decision intent',
          riskNotes: ['Do not publish unsupported price claims']
        }
      ],
      recommendedOptionId: 'option_direct_vs_router',
      approval: {
        status: 'pending_user_confirmation'
      },
      trace: {
        steps: [
          {
            step: 'judge_opportunity',
            status: 'completed',
            summary: 'Selected one comparison option for user confirmation'
          }
        ],
        sourceCoverage: [],
        searchRunIds: [],
        openQuestions: ['Validate pricing and region availability'],
        contradictions: []
      }
    });

    const spec = OpportunitySpecSchema.parse({
      id: 'opp_001',
      slug: 'direct-api-vs-openrouter',
      title: 'Direct API vs OpenRouter',
      market: 'US',
      input: {
        title: 'Direct API vs OpenRouter',
        query: 'direct API vs OpenRouter',
        market: 'US',
        audience: 'small AI teams',
        problem: 'Teams need to choose a safe procurement path',
        outcome: 'Produce a source-backed comparison report',
        geo: 'US',
        language: 'English'
      },
      status: 'draft',
      createdAt: '2026-04-14T00:00:00.000Z',
      audience: 'small AI teams',
      geo: 'US',
      language: 'English',
      searchIntent: 'comparison',
      angle: 'official direct purchase versus routing platform tradeoff',
      firstDeliverySurface: 'report-web',
      pageCandidates: [
        {
          slug: 'direct-api-vs-openrouter',
          title: 'Direct API vs OpenRouter',
          query: 'direct API vs OpenRouter'
        }
      ],
      evidenceRequirements: [
        {
          kind: 'official-pricing',
          note: 'Capture official pricing pages.'
        }
      ],
      productOpportunityHints: [],
      planning
    });

    const confirmation = ConfirmOpportunityRequestSchema.parse({
      selectedOptionId: 'option_direct_vs_router',
      confirmationNotes: 'Proceed with this page angle.'
    });

    expect(spec.planning?.approval.status).toBe('pending_user_confirmation');
    expect(confirmation.selectedOptionId).toBe('option_direct_vs_router');
  });
});
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run:

```powershell
pnpm vitest run tests/contract/opportunity-planning-schema.test.ts
```

Expected: FAIL because `OpportunityQuestionSchema`, `OpportunityPlanningBundleSchema`, and `ConfirmOpportunityRequestSchema` are not exported yet.

- [ ] **Step 3: Add the planning schema module**

Create `packages/contracts/src/opportunity-planning.ts` with these exported schemas:

```ts
OpportunityQuestionSchema
PlanningRoleSchema
StructuredIntentSchema
PlanningRoleBriefSchema
OpportunityOptionSchema
OpportunityApprovalSchema
PlanningTraceStepSchema
PlanningTraceSchema
OpportunityPlanningBundleSchema
ConfirmOpportunityRequestSchema
```

Modify `packages/contracts/src/index.ts` to:

```ts
import { OpportunityPlanningBundleSchema } from './opportunity-planning.js';
export * from './opportunity-planning.js';
```

Also update the existing schema surface:

```ts
export const CompilationPolicyCodeSchema = z.enum([
  'out_of_scope_domain',
  'missing_official_targets',
  'insufficient_public_evidence',
  'needs_authenticated_capture',
  'underspecified_buyer_decision',
  'needs_user_confirmation'
]);

export const OpportunitySpecSchema = z.object({
  // existing fields...
  planningSignalBrief: PlanningSignalBriefSchema.optional(),
  intakeProfile: OpportunityIntakeProfileSchema.optional(),
  planning: OpportunityPlanningBundleSchema.optional()
});
```

- [ ] **Step 4: Run the contract test to verify it passes**

Run:

```powershell
pnpm vitest run tests/contract/opportunity-planning-schema.test.ts
```

Expected: PASS with the new planning schemas parsed through `OpportunitySpecSchema`.

- [ ] **Step 5: Commit**

```powershell
git add packages/contracts/src/opportunity-planning.ts packages/contracts/src/index.ts tests/contract/opportunity-planning-schema.test.ts
git commit -m "feat(contracts): add opportunity planning schemas"
```

## Task 2: Add The Deterministic Planning Core

**Files:**
- Create: `services/control-api/src/planning/intent-structuring.ts`
- Create: `services/control-api/src/planning/planning-swarm.ts`
- Create: `services/control-api/src/planning/opportunity-judge.ts`
- Create: `services/control-api/src/planning/pipeline.ts`
- Modify: `services/control-api/src/compiler.ts`
- Test: `tests/integration/opportunity-planning.test.ts`

- [ ] **Step 1: Write the failing planning-core tests**

Extend `tests/integration/opportunity-planning.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { planOpportunityFromQuestion } from '../../services/control-api/src/planning/pipeline.js';
import { buildCompilation } from '../../services/control-api/src/compiler.js';

describe('intent structuring and opportunity judging', () => {
  it('turns one raw AI procurement question into a pending OpportunitySpec', () => {
    const opportunity = planOpportunityFromQuestion({
      question:
        'For AI coding agents, should my small team buy OpenAI directly or use OpenRouter?',
      geoHint: 'US',
      languageHint: 'English',
      audienceHint: 'small AI teams'
    });

    expect(opportunity.input.query).toContain('OpenRouter');
    expect(opportunity.searchIntent).toBe('comparison');
    expect(opportunity.planning?.approval.status).toBe(
      'pending_user_confirmation'
    );
    expect(opportunity.planning?.roleBriefs.map((item) => item.role)).toContain(
      'opportunity-judge'
    );
  });

  it('blocks compile for raw-question opportunities before user confirmation', async () => {
    const opportunity = planOpportunityFromQuestion({
      question:
        'Should a small AI team buy model APIs directly or through a router?'
    });

    await expect(buildCompilation(opportunity)).rejects.toMatchObject({
      code: 'needs_user_confirmation',
      status: 409
    });
  });
});
```

- [ ] **Step 2: Run the planning-core tests to verify they fail**

Run:

```powershell
pnpm vitest run tests/integration/opportunity-planning.test.ts
```

Expected: FAIL because `planning/pipeline.ts` and the confirmation gate do not exist.

- [ ] **Step 3: Implement intent structuring**

Create `services/control-api/src/planning/intent-structuring.ts`:

```ts
import type { OpportunityQuestion, StructuredIntent } from '@openfons/contracts';

const includesAny = (value: string, terms: string[]) =>
  terms.some((term) => value.toLowerCase().includes(term));

export const structureIntent = (
  question: OpportunityQuestion
): StructuredIntent => {
  const raw = question.question.trim();
  const comparison = includesAny(raw, [' vs ', 'versus', 'compare', 'or use']);

  return {
    keywordSeed: raw,
    topic: 'AI coding model procurement',
    caseKey: 'ai-procurement',
    intentCandidates: comparison
      ? ['procurement_decision', 'routing_decision', 'comparison']
      : ['procurement_decision', 'cost_optimization'],
    audienceCandidates: [question.audienceHint ?? 'small AI teams'],
    geoCandidates: [question.geoHint ?? 'global'],
    languageCandidates: [question.languageHint ?? 'English']
  };
};
```

- [ ] **Step 4: Implement planning role briefs**

Create `services/control-api/src/planning/planning-swarm.ts`:

```ts
import type {
  PlanningRoleBrief,
  StructuredIntent
} from '@openfons/contracts';

export const runPlanningSwarm = (
  intent: StructuredIntent
): PlanningRoleBrief[] => [
  {
    role: 'intent-clarifier',
    summary: `Interpret the seed as ${intent.intentCandidates.join(', ')}.`,
    confidence: 'medium',
    keyFindings: [`Topic: ${intent.topic}`],
    openQuestions: ['Validate official pricing and region availability.'],
    signalFamilies: ['search', 'content']
  },
  {
    role: 'demand-analyst',
    summary: 'The question has recurring procurement and cost-control demand.',
    confidence: 'medium',
    keyFindings: ['Buyer intent is decision-oriented.'],
    openQuestions: ['Confirm current search demand before publishing.'],
    signalFamilies: ['search', 'community', 'update']
  },
  {
    role: 'competition-analyst',
    summary: 'The safest first page is a bounded comparison, not a global price table.',
    confidence: 'medium',
    keyFindings: ['Comparison pages can own clearer search intent.'],
    openQuestions: ['Review SERP saturation before launch.'],
    signalFamilies: ['search', 'content']
  },
  {
    role: 'monetization-analyst',
    summary: 'Procurement decisions can support affiliate, consulting, or calculator expansion.',
    confidence: 'medium',
    keyFindings: ['Commercial intent is stronger than generic browsing.'],
    openQuestions: ['Do not recommend vendors without evidence.'],
    signalFamilies: ['commercial']
  }
];
```

- [ ] **Step 5: Implement opportunity judging**

Create `services/control-api/src/planning/opportunity-judge.ts`:

```ts
import type {
  OpportunityInput,
  OpportunityOption,
  PlanningRoleBrief,
  StructuredIntent
} from '@openfons/contracts';

export const judgeOpportunity = ({
  intent,
  roleBriefs
}: {
  intent: StructuredIntent;
  roleBriefs: PlanningRoleBrief[];
}): {
  option: OpportunityOption;
  input: OpportunityInput;
  judgeBrief: PlanningRoleBrief;
} => {
  const option: OpportunityOption = {
    id: 'option_direct_api_vs_router',
    primaryKeyword: 'direct API vs OpenRouter',
    angle: 'official direct purchase versus routing platform tradeoff',
    audience: intent.audienceCandidates[0],
    geo: intent.geoCandidates[0],
    language: intent.languageCandidates[0],
    searchIntent: 'comparison',
    rationale: 'This is a bounded procurement decision with clear evidence needs.',
    riskNotes: ['Official pricing, routing, and region sources must be captured.']
  };

  const judgeBrief: PlanningRoleBrief = {
    role: 'opportunity-judge',
    summary: `Select ${option.primaryKeyword} as the first confirmation option.`,
    confidence: 'medium',
    keyFindings: roleBriefs.flatMap((brief) => brief.keyFindings).slice(0, 4),
    openQuestions: ['Confirm this page angle before running compile.'],
    signalFamilies: ['search', 'commercial', 'content']
  };

  return {
    option,
    judgeBrief,
    input: {
      title: 'Direct API vs OpenRouter',
      query: option.primaryKeyword,
      market: option.geo,
      audience: option.audience,
      problem: 'Teams need to choose between direct model APIs and routing providers.',
      outcome: 'Produce a source-backed comparison report.',
      geo: option.geo,
      language: option.language
    }
  };
};
```

- [ ] **Step 6: Implement the planning pipeline and compile gate**

Create `services/control-api/src/planning/pipeline.ts`:

```ts
import type { OpportunityQuestion } from '@openfons/contracts';
import { buildOpportunity } from '../compiler.js';
import { buildPlanningSignalBrief } from './signal-brief.js';
import { structureIntent } from './intent-structuring.js';
import { runPlanningSwarm } from './planning-swarm.js';
import { judgeOpportunity } from './opportunity-judge.js';

export const planOpportunityFromQuestion = (question: OpportunityQuestion) => {
  const intent = structureIntent(question);
  const roleBriefs = runPlanningSwarm(intent);
  const { option, input, judgeBrief } = judgeOpportunity({ intent, roleBriefs });
  const opportunity = buildOpportunity(input);
  const planningSignalBrief = buildPlanningSignalBrief(input);

  return {
    ...opportunity,
    planningSignalBrief,
    planning: {
      question,
      intent,
      roleBriefs: [...roleBriefs, judgeBrief],
      options: [option],
      recommendedOptionId: option.id,
      approval: {
        status: 'pending_user_confirmation' as const
      },
      trace: {
        steps: [
          {
            step: 'structure_intent' as const,
            status: 'completed' as const,
            summary: 'Structured raw question into AI procurement intent.'
          },
          {
            step: 'judge_opportunity' as const,
            status: 'completed' as const,
            summary: `Recommended ${option.primaryKeyword}.`
          }
        ],
        sourceCoverage: planningSignalBrief.sourceCoverage,
        searchRunIds: [],
        openQuestions: ['Validate pricing, routing, region, and community evidence.'],
        contradictions: []
      }
    }
  };
};
```

Modify `services/control-api/src/compiler.ts` before policy classification:

```ts
if (
  opportunity.planning &&
  opportunity.planning.approval.status !== 'confirmed'
) {
  throw new CompilationPolicyError(
    'needs_user_confirmation',
    409,
    'Opportunity must be confirmed before compilation.'
  );
}
```

- [ ] **Step 7: Re-run planning-core tests**

Run:

```powershell
pnpm vitest run tests/integration/opportunity-planning.test.ts
```

Expected: PASS for the new planning tests and existing `signal-brief` tests.

- [ ] **Step 8: Commit**

```powershell
git add services/control-api/src/planning/intent-structuring.ts services/control-api/src/planning/planning-swarm.ts services/control-api/src/planning/opportunity-judge.ts services/control-api/src/planning/pipeline.ts services/control-api/src/compiler.ts tests/integration/opportunity-planning.test.ts
git commit -m "feat(control-api): add opportunity planning core"
```

## Task 3: Expose Planning And Confirmation APIs

**Files:**
- Modify: `services/control-api/src/app.ts`
- Modify: `services/control-api/src/store.ts` only if needed
- Test: `tests/integration/control-api.test.ts`

- [ ] **Step 1: Write failing API tests**

Add to `tests/integration/control-api.test.ts`:

```ts
it('plans, confirms, and compiles an opportunity from a raw question', async () => {
  const app = createApp({
    buildAiProcurementCaseBundle: async (opportunity, workflow) =>
      createRealBridgeBundle(opportunity, workflow)
  });

  const planResponse = await app.request('/api/v1/opportunities/plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      question:
        'For AI coding agents, should my team buy direct APIs or use OpenRouter?'
    })
  });

  expect(planResponse.status).toBe(201);
  const planned = await planResponse.json();
  expect(planned.opportunity.planning.approval.status).toBe(
    'pending_user_confirmation'
  );

  const blockedCompile = await app.request(
    `/api/v1/opportunities/${planned.opportunity.id}/compile`,
    { method: 'POST' }
  );
  expect(blockedCompile.status).toBe(409);
  await expect(blockedCompile.json()).resolves.toMatchObject({
    code: 'needs_user_confirmation'
  });

  const confirmResponse = await app.request(
    `/api/v1/opportunities/${planned.opportunity.id}/confirm`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selectedOptionId: planned.opportunity.planning.recommendedOptionId,
        confirmationNotes: 'Proceed with the recommended comparison page.'
      })
    }
  );

  expect(confirmResponse.status).toBe(200);
  const confirmed = await confirmResponse.json();
  expect(confirmed.opportunity.planning.approval.status).toBe('confirmed');

  const compileResponse = await app.request(
    `/api/v1/opportunities/${planned.opportunity.id}/compile`,
    { method: 'POST' }
  );
  expect(compileResponse.status).toBe(200);
});
```

- [ ] **Step 2: Run the API test to verify it fails**

Run:

```powershell
pnpm vitest run tests/integration/control-api.test.ts
```

Expected: FAIL because `/plan` and `/confirm` do not exist yet.

- [ ] **Step 3: Add `/plan` endpoint**

Modify `services/control-api/src/app.ts`:

```ts
import {
  ConfirmOpportunityRequestSchema,
  OpportunityQuestionSchema
} from '@openfons/contracts';
import { planOpportunityFromQuestion } from './planning/pipeline.js';
```

```ts
app.post('/api/v1/opportunities/plan', async (c) => {
  const payload = await c.req.json().catch(() => undefined);
  const parsed = OpportunityQuestionSchema.safeParse(payload);

  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message });
  }

  const opportunity = planOpportunityFromQuestion(parsed.data);
  store.saveOpportunity(opportunity);
  return c.json({ opportunity }, 201);
});
```

- [ ] **Step 4: Add `/confirm` endpoint**

Modify `services/control-api/src/app.ts`:

```ts
app.post('/api/v1/opportunities/:opportunityId/confirm', async (c) => {
  const opportunityId = c.req.param('opportunityId');
  const opportunity = store.getOpportunity(opportunityId);

  if (!opportunity) {
    throw new HTTPException(404, { message: 'Opportunity not found' });
  }
  if (!opportunity.planning) {
    throw new HTTPException(409, {
      message: 'Opportunity does not require planning confirmation'
    });
  }

  const payload = await c.req.json().catch(() => undefined);
  const parsed = ConfirmOpportunityRequestSchema.safeParse(payload);

  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message });
  }

  const selected = opportunity.planning.options.find(
    (option) => option.id === parsed.data.selectedOptionId
  );

  if (!selected) {
    throw new HTTPException(400, { message: 'Selected opportunity option not found' });
  }

  const confirmed = {
    ...opportunity,
    planning: {
      ...opportunity.planning,
      approval: {
        status: 'confirmed' as const,
        selectedOptionId: selected.id,
        confirmedAt: new Date().toISOString(),
        confirmationNotes: parsed.data.confirmationNotes
      },
      trace: {
        ...opportunity.planning.trace,
        steps: [
          ...opportunity.planning.trace.steps,
          {
            step: 'confirm_user_scope' as const,
            status: 'completed' as const,
            summary: `Confirmed ${selected.primaryKeyword}.`
          }
        ]
      }
    }
  };

  store.saveOpportunity(confirmed);
  return c.json({ opportunity: confirmed });
});
```

- [ ] **Step 5: Preserve legacy structured intake**

In the existing `/api/v1/opportunities` endpoint, keep accepting `OpportunityInputSchema`. Do not attach `pending_user_confirmation` to this legacy path. This treats the manually supplied structured input as already operator-confirmed and keeps existing tests compatible.

- [ ] **Step 6: Re-run API tests**

Run:

```powershell
pnpm vitest run tests/integration/control-api.test.ts
```

Expected: PASS including existing artifact delivery, fallback, validation, and policy tests.

- [ ] **Step 7: Commit**

```powershell
git add services/control-api/src/app.ts tests/integration/control-api.test.ts
git commit -m "feat(control-api): expose opportunity planning confirmation"
```

## Task 4: Update Control Web To Raw Question Review Flow

**Files:**
- Modify: `apps/control-web/src/api.ts`
- Modify: `apps/control-web/src/pages/opportunity-page.tsx`
- Test: `tests/smoke/control-web.test.tsx`

- [ ] **Step 1: Write the failing UI smoke test**

Update `tests/smoke/control-web.test.tsx` with a new primary-flow test:

```tsx
it('plans from a raw question, asks for confirmation, then compiles', async () => {
  const api = {
    planOpportunity: vi.fn(async () => plannedOpportunity),
    confirmOpportunity: vi.fn(async () => confirmedOpportunity),
    createOpportunity: vi.fn(),
    compileOpportunity: vi.fn(async () => compiledResult)
  };

  render(<OpportunityPage api={api} reportBaseUrl="http://localhost:3002" />);

  fireEvent.change(screen.getByLabelText(/question/i), {
    target: {
      value:
        'For AI coding agents, should my team buy direct APIs or use OpenRouter?'
    }
  });
  fireEvent.click(screen.getByRole('button', { name: /plan opportunity/i }));

  expect(await screen.findByText(/direct api vs openrouter/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /confirm and compile/i }));

  expect(api.confirmOpportunity).toHaveBeenCalledWith('opp_001', {
    selectedOptionId: 'option_direct_api_vs_router'
  });
  expect(
    await screen.findByRole('link', { name: /open report shell/i })
  ).toHaveAttribute('href', 'http://localhost:3002/reports/report_001');
});
```

Define `plannedOpportunity`, `confirmedOpportunity`, and `compiledResult` in the test file using the current fixture style. They must include `planning.options`, `planning.recommendedOptionId`, and `planning.approval`.

- [ ] **Step 2: Run the UI smoke test to verify it fails**

Run:

```powershell
pnpm vitest run tests/smoke/control-web.test.tsx
```

Expected: FAIL because `ControlApi` does not expose `planOpportunity` or `confirmOpportunity`, and the page still renders the structured form.

- [ ] **Step 3: Extend the control-web API client**

Modify `apps/control-web/src/api.ts`:

```ts
import type {
  ConfirmOpportunityRequest,
  OpportunityQuestion
} from '@openfons/contracts';

export type ControlApi = {
  planOpportunity: (question: OpportunityQuestion) => Promise<OpportunitySpec>;
  confirmOpportunity: (
    opportunityId: string,
    request: ConfirmOpportunityRequest
  ) => Promise<OpportunitySpec>;
  createOpportunity: (input: OpportunityInput) => Promise<OpportunitySpec>;
  compileOpportunity: (opportunityId: string) => Promise<CompilationResult>;
};
```

Add implementations for:

```ts
const postJson = async (url: string, body: unknown) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw await readApiError(response, 'Control API request failed');
  }
  const parsed = (await response.json()) as { opportunity: OpportunitySpec };
  return parsed.opportunity;
};

planOpportunity(question) {
  return postJson(`${baseUrl}/api/v1/opportunities/plan`, question);
}

confirmOpportunity(opportunityId, request) {
  return postJson(
    `${baseUrl}/api/v1/opportunities/${opportunityId}/confirm`,
    request
  );
}
```

Keep `createOpportunity()` for legacy tests and internal compatibility.

- [ ] **Step 4: Replace the primary UI form**

Modify `apps/control-web/src/pages/opportunity-page.tsx` so the primary flow is:

1. textarea labeled `Question`
2. optional hint fields for `Audience`, `Geo`, `Language`, `Market`
3. `Plan opportunity` button
4. recommended option panel
5. `Confirm and compile` button

The submit path should call:

```ts
const planned = await api.planOpportunity(question);
setOpportunity(planned);
```

The confirm path should call:

```ts
const confirmed = await api.confirmOpportunity(opportunity.id, {
  selectedOptionId: opportunity.planning.recommendedOptionId
});
const compiled = await api.compileOpportunity(confirmed.id);
setResult(compiled);
```

- [ ] **Step 5: Re-run UI smoke tests**

Run:

```powershell
pnpm vitest run tests/smoke/control-web.test.tsx
```

Expected: PASS for the new raw-question path and retained API error handling.

- [ ] **Step 6: Commit**

```powershell
git add apps/control-web/src/api.ts apps/control-web/src/pages/opportunity-page.tsx tests/smoke/control-web.test.tsx
git commit -m "feat(control-web): add opportunity planning review flow"
```

## Task 5: Add Planning Trace Discipline

**Files:**
- Create: `services/control-api/src/planning/trace.ts`
- Modify: `services/control-api/src/planning/signal-brief.ts`
- Modify: `tests/integration/opportunity-planning.test.ts`

- [ ] **Step 1: Write the failing planning trace test**

Add to `tests/integration/opportunity-planning.test.ts`:

```ts
it('records planning trace steps and source coverage without turning them into final evidence', () => {
  const opportunity = planOpportunityFromQuestion({
    question:
      'Can OpenRouter beat direct APIs for a small AI coding team in the US?'
  });

  expect(opportunity.planning?.trace.steps.map((item) => item.step)).toEqual(
    expect.arrayContaining(['structure_intent', 'judge_opportunity'])
  );
  expect(opportunity.planning?.trace.sourceCoverage.length).toBeGreaterThan(0);
  expect(opportunity.planning?.trace.searchRunIds).toEqual([]);
  expect(opportunity).not.toHaveProperty('evidenceSet');
});
```

- [ ] **Step 2: Run the planning trace test to verify it fails**

Run:

```powershell
pnpm vitest run tests/integration/opportunity-planning.test.ts
```

Expected: FAIL until trace generation is centralized and source coverage is populated consistently.

- [ ] **Step 3: Centralize trace generation**

Create `services/control-api/src/planning/trace.ts`:

```ts
import type {
  PlanningSignalBrief,
  PlanningTrace
} from '@openfons/contracts';

export const buildPlanningTrace = ({
  signalBrief,
  recommendedKeyword
}: {
  signalBrief: PlanningSignalBrief;
  recommendedKeyword: string;
}): PlanningTrace => ({
  steps: [
    {
      step: 'structure_intent',
      status: 'completed',
      summary: 'Structured the raw user question into AI procurement intent.'
    },
    {
      step: 'run_demand_analysis',
      status: 'completed',
      summary: signalBrief.briefGoal
    },
    {
      step: 'run_competition_analysis',
      status: 'completed',
      summary: 'Kept the first option bounded to one comparison page.'
    },
    {
      step: 'run_monetization_analysis',
      status: 'completed',
      summary: 'Preserved commercial fit as a planning signal, not a final claim.'
    },
    {
      step: 'judge_opportunity',
      status: 'completed',
      summary: `Recommended ${recommendedKeyword} for user confirmation.`
    }
  ],
  sourceCoverage: signalBrief.sourceCoverage,
  searchRunIds: [],
  openQuestions: ['Run live planning discovery before treating demand as validated.'],
  contradictions: []
});
```

Use this helper from `planning/pipeline.ts` instead of building trace inline.

- [ ] **Step 4: Re-run trace tests**

Run:

```powershell
pnpm vitest run tests/integration/opportunity-planning.test.ts
```

Expected: PASS and no final evidence objects appear before compile.

- [ ] **Step 5: Commit**

```powershell
git add services/control-api/src/planning/trace.ts services/control-api/src/planning/pipeline.ts tests/integration/opportunity-planning.test.ts
git commit -m "feat(control-api): add opportunity planning trace"
```

## Task 6: Run Verification And Close `v015`

**Files:**
- Modify: none
- Test: `tests/contract/opportunity-planning-schema.test.ts`
- Test: `tests/integration/opportunity-planning.test.ts`
- Test: `tests/integration/control-api.test.ts`
- Test: `tests/smoke/control-web.test.tsx`

- [ ] **Step 1: Run focused tests**

Run:

```powershell
pnpm vitest run tests/contract/opportunity-planning-schema.test.ts tests/integration/opportunity-planning.test.ts tests/integration/control-api.test.ts tests/smoke/control-web.test.tsx
```

Expected: PASS for all four files.

- [ ] **Step 2: Run workspace verification**

Run:

```powershell
pnpm lint
pnpm typecheck
pnpm build
```

Expected: PASS with no TypeScript or build errors.

- [ ] **Step 3: Review the git diff**

Run:

```powershell
git status --short
git diff --stat
git diff -- packages/contracts/src/opportunity-planning.ts services/control-api/src/planning/pipeline.ts services/control-api/src/app.ts apps/control-web/src/pages/opportunity-page.tsx
```

Expected: diff includes only planned `v015` implementation files and tests; `.tmp/` remains untracked and unstaged.

- [ ] **Step 4: Commit the verified batch**

```powershell
git add packages/contracts/src/opportunity-planning.ts packages/contracts/src/index.ts services/control-api/src/planning/intent-structuring.ts services/control-api/src/planning/planning-swarm.ts services/control-api/src/planning/opportunity-judge.ts services/control-api/src/planning/pipeline.ts services/control-api/src/planning/trace.ts services/control-api/src/compiler.ts services/control-api/src/app.ts apps/control-web/src/api.ts apps/control-web/src/pages/opportunity-page.tsx tests/contract/opportunity-planning-schema.test.ts tests/integration/opportunity-planning.test.ts tests/integration/control-api.test.ts tests/smoke/control-web.test.tsx
git commit -m "feat(control-plane): add opportunity planning confirmation"
```

## Self-Review

### Spec Coverage

- Raw user question intake is covered by Task 1 and Task 2.
- `OpportunitySpec` as the single downstream contract is covered by Task 1.
- User confirmation gate is covered by Task 2 and Task 3.
- Legacy `OpportunityInput` compatibility is covered by Task 3.
- `control-web` primary flow migration is covered by Task 4.
- Planning trace / discovery audit boundary is covered by Task 5.

### Placeholder Scan

This plan does not leave code behavior as `TODO` or `TBD`. The only intentionally deferred capability is live external discovery enrichment beyond trace IDs, which remains outside this first `v015` implementation unless a later scope decision adds it.

### Type Consistency

The plan consistently uses:

- `OpportunityQuestion` for raw intake
- `OpportunityPlanningBundle` under `OpportunitySpec.planning`
- `OpportunityInput` as the normalized compiler bridge
- `ConfirmOpportunityRequest` for user confirmation
- `needs_user_confirmation` as the compile policy error code

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-14-intent-structuring-and-opportunity-judging.md`.

Recommended execution after review:

1. Batch 1: contracts + deterministic planning core
2. Batch 2: `control-api` planning / confirmation API
3. Batch 3: `control-web` intake and review flow
4. Batch 4: planning trace discipline and full verification
