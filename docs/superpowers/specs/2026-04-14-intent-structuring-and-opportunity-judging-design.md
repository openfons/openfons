# Intent Structuring And Opportunity Judging Design

## Context

`v014` has completed and pushed the source-readiness / retrieval-orchestration mainline. The remaining internal north-star gap is now earlier in the pipeline.

The current code still begins from a manually filled `OpportunityInput`:

`OpportunityInput -> OpportunitySpec -> TaskSpec / WorkflowSpec -> EvidenceSet -> ReportSpec -> Artifact`

That path is useful as a structured compiler bridge, but it is not yet the real first mile described by the SoT:

`real user question -> Intent Structuring -> Planning Swarm -> Opportunity Judge -> OpportunitySpec -> user confirmation -> Task Compiler`

The current `services/control-api/src/planning/signal-brief.ts` already adds a small `planningSignalBrief` and `intakeProfile`, but it does not yet make the front-of-pipeline planning layer first-class. The control UI still asks the user to manually provide title, query, market, audience, geo, language, problem, and outcome before the system can plan anything.

External runtime / smoke closure remains important, but the latest machine check still shows external blockers around `yt-dlp` and placeholder secret material. It should therefore be handled as a separate closure/status track, not as the `v015` internal mainline.

## Problem Statement

OpenFons needs a controlled way to turn a raw user question into one auditable `OpportunitySpec` before evidence collection and report compilation begin.

If the system keeps starting from a manually filled `OpportunityInput`, three failures remain:

1. user wording can be mistaken for final title, query, and market selection
2. opportunity judging has no explicit user-confirmation boundary
3. planning role outputs and discovery traces remain implicit instead of replayable

`v015` should close that first-mile gap without introducing a large autonomous agent runtime.

## Goals

1. Add a first-class raw-question intake contract for the control plane.
2. Keep `OpportunitySpec` as the single downstream pre-confirmation contract.
3. Keep `IntentSpec`, `DemandResearchBrief`, `OpportunityMap`, and `ApprovalPayload` as internal subobjects under `OpportunitySpec`, not as peer downstream contracts.
4. Make the planning workflow explicit:
   - `structure_intent`
   - `run_demand_analysis`
   - `run_competition_analysis`
   - `run_monetization_analysis`
   - `judge_opportunity`
   - `confirm_user_scope`
5. Preserve the existing AI procurement compiler by deriving the current `OpportunityInput` bridge from the judged `OpportunitySpec`.
6. Make compile gated by user confirmation for the new raw-question path.
7. Keep discovery and planning trace data auditable without pretending it is final `EvidenceSet`.

## Non-Goals

1. Do not implement a fully generic multi-agent runtime in this phase.
2. Do not make an LLM directly control crawler or browser execution.
3. Do not expand into new crawler adapters.
4. Do not reopen config-center or retrieval orchestration scope.
5. Do not claim external `youtube / tiktok` smoke success.
6. Do not replace the current AI procurement compiler with a generic report writer.
7. Do not expose `IntentSpec`, `DemandResearchBrief`, `OpportunityMap`, or `ApprovalPayload` as independent downstream API contracts.

## Options Considered

### Option A: Keep `OpportunityInput` As The Only Entry

This preserves the smallest code surface, but it keeps the user-facing first mile manual. The UI would still ask the user to solve the planning problem before OpenFons does any planning.

Result: rejected as the `v015` mainline.

### Option B: Add One Raw-Question Intake And Fold Planning Into `OpportunitySpec`

This adds a new intake contract, then compiles the raw question into a judged `OpportunitySpec` with an internal planning bundle. The existing `OpportunityInput` remains as a derived bridge for the current compiler.

Result: recommended.

### Option C: Add Several Peer Planning Contracts

This would expose separate top-level contracts such as `IntentSpec`, `DemandResearchBrief`, `OpportunityMap`, and `ApprovalPayload`.

It looks explicit, but it creates too many downstream truth sources and contradicts the current SoT rule that downstream systems should consume one front-of-pipeline object: `OpportunitySpec`.

Result: rejected.

## Design Overview

The new intended flow is:

```text
OpportunityQuestion
  -> structure_intent
  -> run_demand_analysis
  -> run_competition_analysis
  -> run_monetization_analysis
  -> judge_opportunity
  -> OpportunitySpec(planning.approval.status = pending_user_confirmation)
  -> confirm_user_scope
  -> OpportunitySpec(planning.approval.status = confirmed)
  -> buildCompilation()
```

The important compatibility rule:

The existing `OpportunityInput` does not disappear immediately. It becomes the normalized compiler bridge inside `OpportunitySpec.input`. The legacy structured endpoint may continue to treat a manually supplied `OpportunityInput` as operator-confirmed, so existing tests and scripted flows are not broken during the migration.

## Object Model

### `OpportunityQuestion`

`OpportunityQuestion` is the raw user-question intake contract.

Minimum fields:

- `question`
- `marketHint`
- `audienceHint`
- `geoHint`
- `languageHint`
- `deliveryIntent`
- `caseHint`

Only `question` is required. The hints are optional inputs to planning, not final truth.

### `OpportunitySpec.planning`

`OpportunitySpec` gains one planning bundle:

```text
OpportunitySpec.planning
  question
  intent
  roleBriefs
  options
  recommendedOptionId
  approval
  trace
```

This bundle is the internal home for what earlier documents described as:

- `IntentSpec`
- `DemandResearchBrief`
- `OpportunityMap`
- `ApprovalPayload`

They do not become peer external contracts.

### `StructuredIntent`

Captures the interpretation of the user question:

- `keywordSeed`
- `topic`
- `intentCandidates`
- `audienceCandidates`
- `geoCandidates`
- `languageCandidates`
- `caseKey`

For `v015`, `caseKey` should remain bounded to the AI procurement case unless a later scope decision expands the compiler.

### `PlanningRoleBrief`

Captures role-level outputs from the controlled planning swarm:

- `role`
- `summary`
- `confidence`
- `keyFindings`
- `openQuestions`
- `signalFamilies`

Required `v015` roles:

- `intent-clarifier`
- `demand-analyst`
- `competition-analyst`
- `monetization-analyst`
- `opportunity-judge`

These are controlled role labels, not free-form autonomous agents.

### `OpportunityOption`

Represents candidate page / report directions before user confirmation:

- `id`
- `primaryKeyword`
- `angle`
- `audience`
- `geo`
- `language`
- `searchIntent`
- `rationale`
- `riskNotes`

The system may recommend one option, but the user still confirms the final scope before compilation.

### `OpportunityApproval`

Captures the confirmation boundary:

- `status`: `pending_user_confirmation` or `confirmed`
- `selectedOptionId`
- `confirmedAt`
- `confirmationNotes`

The new raw-question path must produce `pending_user_confirmation` first. Compilation should be blocked until confirmation.

### `PlanningTrace`

Captures the replayable planning steps:

- `steps`
- `sourceCoverage`
- `searchRunIds`
- `openQuestions`
- `contradictions`

Planning trace is not final evidence. In `v015`, `searchRunIds` is a reserved audit field and may stay empty while deterministic planning records `steps`, `sourceCoverage`, and `openQuestions`. If a later phase adds search discovery, it should record `searchRunIds` there. Final evidence still belongs to `TopicRun / SourceCapture / CollectionLog / EvidenceSet`.

## API Boundary

### New preferred API path

```text
POST /api/v1/opportunities/plan
POST /api/v1/opportunities/:opportunityId/confirm
POST /api/v1/opportunities/:opportunityId/compile
```

`/plan` accepts `OpportunityQuestion` and returns a draft `OpportunitySpec`.

`/confirm` accepts a selected option and updates `OpportunitySpec.planning.approval`.

`/compile` continues to return `CompilationResult`, but must block the raw-question path until `approval.status` is `confirmed`.

### Legacy compatibility path

```text
POST /api/v1/opportunities
```

The existing structured endpoint may remain as a legacy / internal path. Because the caller already supplied all normalized fields, this path can stamp the opportunity as confirmed by structured intake.

This avoids breaking existing test coverage while the UI migrates to the new planning path.

## Service Boundaries

### `packages/contracts`

Owns:

- `OpportunityQuestion`
- planning bundle schemas
- confirmation request schema
- the extended `OpportunitySpec`
- compile policy code for missing user confirmation

### `services/control-api`

Owns:

- deterministic first-mile planning pipeline
- legacy `OpportunityInput` compatibility bridge
- user confirmation endpoint
- compile confirmation gate
- optional planning discovery trace injection

It should not become a crawler executor or a generic LLM runtime in this phase.

### `apps/control-web`

Owns:

- raw-question intake UI
- recommended option review
- user confirmation action
- compile action after confirmation

The UI should no longer force users to fill the full structured `OpportunityInput` before the platform can plan.

### `services/search-gateway`

Remains the search executor and route-orchestration service.

`search-gateway` remains reserved for a later live-discovery phase. When that phase exists, `control-api` should call search with `purpose: planning` and store the resulting `searchRun.id` values in `planning.trace.searchRunIds`. `search-gateway` must not become the opportunity judge. `v015` itself does not require this integration.

## Data Flow

1. User submits a raw question and optional hints from `control-web`.
2. `control-api` structures intent and creates role briefs.
3. `Opportunity Judge` chooses a recommended option and derives the normalized `OpportunityInput` bridge.
4. `control-api` stores an `OpportunitySpec` with `approval.status = pending_user_confirmation`.
5. User confirms a selected option.
6. `control-api` updates `approval.status = confirmed`.
7. Compile proceeds through the existing AI procurement path.

## Error Handling

1. Empty raw question returns `400`.
2. Unsupported domain remains a compile policy failure, not a planning crash.
3. Compile before confirmation returns a structured compile policy error such as `needs_user_confirmation`.
4. Missing or unrecognized selected option returns `400`.
5. Planning discovery failures should appear in `planning.trace.openQuestions` or `planning.trace.steps`, not silently disappear.

## Testing Strategy

Minimum tests:

1. contract tests for the new planning schemas
2. `control-api` planning tests for raw question to judged `OpportunitySpec`
3. confirmation tests for selected option update and compile gating
4. legacy endpoint regression tests proving existing structured intake still compiles
5. `control-web` smoke tests for raw-question intake, option review, confirmation, and report link

## Implementation Batches

### Batch 1: `contracts + planning core`

Add the planning schemas and deterministic first-mile pipeline.

### Batch 2: `control-api API + compile gate`

Expose `/plan` and `/confirm`; block raw-question compilation before confirmation; keep legacy structured intake compatible.

### Batch 3: `control-web intake and review`

Move the UI from a manual structured form to a raw question plus review/confirm flow.

### Batch 4: `planning trace discipline`

Ensure planning steps, source coverage, and open questions are recorded in `OpportunitySpec.planning.trace` without promoting them to final evidence. Keep `searchRunIds` as a reserved audit field for a later `purpose: planning` live-discovery integration.

## Acceptance Signals

`v015` is correctly implemented when:

1. a user can submit one raw AI procurement question and receive a judged `OpportunitySpec`
2. the returned spec contains planning roles, options, a recommendation, and a pending confirmation state
3. compile is blocked before confirmation and succeeds after confirmation
4. the existing structured `OpportunityInput` path remains compatible during migration
5. `control-web` no longer requires the full manual structured form for the primary flow
6. planning trace data is visible enough to replay how the recommended opportunity was chosen

## Final Summary

`v015` should not be a new crawler, config-center, or evidence-hardening phase.

It should close the front of the pipeline:

`real question -> controlled planning -> judged OpportunitySpec -> user confirmation`

That is the narrowest next step that aligns the current code with the SoT north star while keeping external smoke as a separate externally blocked closure track.
