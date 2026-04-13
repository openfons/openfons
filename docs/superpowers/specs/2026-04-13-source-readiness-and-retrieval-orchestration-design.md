# Source Readiness And Retrieval Orchestration Design

## Context

`v013` has already synchronized the platform SoT and clarified the current stage:

- `config-center` is no longer the main unfinished platform gap
- `artifact delivery` already exists for the `AI procurement` single-case flow
- real external smoke is still blocked by external materials, not by missing internal architecture

That leaves one important internal gap for the next scoped design step:

OpenFons still lacks one formal model that connects:

1. operator-visible source readiness
2. retrieval-time route selection and fallback
3. evidence-side acquisition metadata

Today these ideas mostly exist as partial route validation, runtime preflight, and engineering judgment. `v014` should not jump into new crawler families or new external runtime work. It should turn this implicit decision logic into explicit contracts and one narrow orchestration model.

## Goals

1. Define one shared readiness model that operators and runtime code can both understand.
2. Define how readiness is translated into retrieval orchestration decisions instead of leaving fallback behavior implicit.
3. Define the acquisition metadata that downstream evidence consumers can trust without re-deciding readiness.
4. Keep the design inside the current service shape:
   - `packages/contracts`
   - `packages/config-center`
   - `services/control-api`
   - `services/search-gateway`
   - the current evidence metadata consumer path

## Non-Goals

1. No return to real external smoke closure in this scope.
2. No new UI, dashboard, operator console, or portal.
3. No new scheduler, watchlist, workflow engine, or orchestration service.
4. No expansion into new crawler families such as new adapters beyond current first adopters.
5. No redesign of `artifact delivery` or report compilation in this round.
6. No secret mutation API or new secret backend.

## Options Considered

### Option A: Readiness-only spec

This would define `SourceReadiness / RouteReadiness` first and leave retrieval orchestration for later.

Benefits:

- smallest initial scope
- easy to explain to operators

Why not:

- it leaves the runtime translation layer ambiguous
- it creates a second spec cycle for the exact same decision surface
- evidence metadata still would not know which fields are authoritative

### Option B: Gateway-local orchestration spec

This would let `search-gateway` invent its own planning and fallback model first, and add readiness later.

Benefits:

- fast for one executor
- focuses on immediate runtime behavior

Why not:

- it would duplicate readiness logic outside the operator surface
- it would make `control-api` descriptive instead of authoritative
- later adoption by evidence metadata would become retrofit work

### Option C: One umbrella spec with shared objects and two parallel tracks

This defines one shared object model, then splits implementation into:

- Track 1: readiness contracts and operator surface
- Track 2: retrieval orchestration and evidence metadata flow

This is the recommended option because it preserves one source of truth while still allowing phased implementation.

## Design Overview

`v014` should be one umbrella design named:

`source readiness and retrieval orchestration`

It contains two parallel but connected tracks.

### Track 1: Readiness Contracts And Operator Surface

This track makes readiness explicit and operator-readable.

Its job is to answer:

- is a source usable right now
- which routes are healthy, degraded, or blocked
- what requirements, blockers, and warnings explain that state
- which route is primary vs fallback vs supplemental

### Track 2: Retrieval Orchestration And Evidence Metadata Flow

This track makes runtime retrieval behavior deterministic.

Its job is to answer:

- which routes should be attempted first
- when fallback should happen
- how skipped routes are recorded
- what evidence-side acquisition metadata must be emitted after each attempt

The design rule is simple:

readiness is decided once, orchestration consumes that decision, and evidence metadata records the result without re-deciding it.

## Shared Objects

`v014` should formalize six shared objects.

### 1. `SourceReadiness`

Represents the aggregated readiness of one logical source such as `youtube`, `reddit`, or another supported source family.

Minimum fields:

- `sourceId`
- `status`
- `routes`
- `summary`
- `updatedAt`

### 2. `RouteReadiness`

Represents the readiness of one concrete retrieval route inside a source.

Minimum fields:

- `sourceId`
- `routeKey`
- `status`
- `qualityTier`
- `requirements`
- `blockers`
- `warnings`
- `detail`

`qualityTier` values:

- `primary`
- `fallback`
- `supplemental`

`status` values:

- `ready`
- `degraded`
- `blocked`

### 3. `RetrievalPlan`

Represents the runtime plan generated from readiness plus the incoming retrieval intent.

Minimum fields:

- `sourceId`
- `planVersion`
- `generatedAt`
- `candidates`
- `omissions`

Each candidate should carry at least:

- `routeKey`
- `qualityTier`
- `status`
- `priority`
- `penaltyReason`

### 4. `RetrievalAttempt`

Represents one concrete execution attempt against one route.

Minimum fields:

- `sourceId`
- `routeKey`
- `attemptIndex`
- `startedAt`
- `finishedAt`
- `decisionBasis`
- `result`

### 5. `RetrievalOutcome`

Represents the overall result of one orchestration run.

Minimum fields:

- `sourceId`
- `planVersion`
- `attempts`
- `selectedRoute`
- `status`
- `omissions`

Recommended `status` values:

- `succeeded`
- `partial`
- `failed`
- `blocked`

### 6. `EvidenceAcquisitionMeta`

Represents the acquisition metadata attached to evidence or evidence-like records produced by retrieval.

Minimum fields:

- `sourceId`
- `routeKey`
- `qualityTier`
- `routeStatusAtAttempt`
- `retrievalStatus`
- `attemptedAt`
- `decisionReason`
- `warnings`
- `blockers`

## Readiness Model

### Route Status Semantics

`RouteReadiness.status` must use exactly:

- `ready`: route satisfies current requirements and can be treated as a normal candidate
- `degraded`: route is usable with penalties, lower confidence, or reduced completeness
- `blocked`: route must not be executed now

`RouteReadiness` must expose explanation fields instead of forcing callers to reverse-engineer them:

- `requirements`: what must exist for the route to be fully usable
- `blockers`: what currently prevents execution
- `warnings`: what weakens confidence or quality without fully blocking execution

Examples:

- missing cookie or account secret belongs in `blockers`
- unstable public-only mode belongs in `warnings`
- required proxy capability belongs in `requirements`

### Route Quality Tier Semantics

`qualityTier` describes the intended role of a route when multiple routes exist:

- `primary`: preferred default route when ready
- `fallback`: acceptable degraded or backup route
- `supplemental`: optional route that can enrich results but should not be mistaken for the main acquisition path

`qualityTier` is not the same thing as readiness. A `primary` route may still be `blocked`, and a `fallback` route may be `ready`.

### Source Aggregation Rules

`SourceReadiness.status` is derived from its route states:

1. if any route is `ready`, the source is `ready`
2. else if any route is `degraded`, the source is `degraded`
3. else the source is `blocked`

This keeps source readiness simple and prevents operator-facing ambiguity.

## Translation From Readiness To Orchestration

The key contract of `v014` is that readiness must translate into deterministic planning rules.

### Candidate Translation Rules

1. `ready` routes become normal candidates.
2. `degraded` routes become fallback candidates with an explicit penalty.
3. `blocked` routes never become executable candidates.

### Omission Rule

Blocked routes must never silently disappear.

If a route is excluded because it is `blocked`, the resulting `RetrievalPlan` or `RetrievalOutcome` must contain an omission record that explains:

- `routeKey`
- `status`
- `reason`

This matters because operators and downstream evidence consumers need to distinguish:

- route was not chosen
- route was tried and failed
- route was blocked before execution

### Priority Rule

Candidate order should be derived from:

1. readiness status
2. quality tier
3. route-specific penalties or warnings

Recommended default order:

1. `ready + primary`
2. `ready + fallback`
3. `ready + supplemental`
4. `degraded + primary`
5. `degraded + fallback`
6. `degraded + supplemental`

This order may later be refined by source-specific rules, but `v014` should standardize the default translation first.

## Service And Package Boundaries

### `packages/contracts`

Own the shared object definitions for:

- `SourceReadiness`
- `RouteReadiness`
- `RetrievalPlan`
- `RetrievalAttempt`
- `RetrievalOutcome`
- `EvidenceAcquisitionMeta`

This package should be the first place where these terms become formal and reusable.

### `packages/config-center`

Own the readiness evaluation core.

That core should be responsible for:

- mapping project-bound config and secret references into readiness requirements
- evaluating route-level readiness
- aggregating source-level readiness
- producing explanation fields consistently

This keeps readiness close to the existing config and runtime-preflight knowledge instead of re-implementing it in `control-api` or `search-gateway`.

### `services/control-api`

Is the authoritative operator-facing read surface.

Its role is:

- expose readiness reports
- expose source and route explanations
- remain read-only for this scope

It is not the retrieval executor.

### `services/search-gateway`

Is the first retrieval orchestration executor.

Its role is:

- consume readiness
- build `RetrievalPlan`
- execute candidate attempts in order
- produce `RetrievalOutcome`
- emit acquisition metadata for downstream evidence flow

It must not invent a second readiness model.
It may consume shared readiness contracts and core evaluators directly; it should not depend on a second set of gateway-local heuristics.

### Evidence Metadata Consumer

The current evidence metadata consumer is downstream only.

Its role is:

- accept `EvidenceAcquisitionMeta`
- store or surface acquisition facts
- avoid re-deciding route readiness or fallback policy

If the consumer needs interpretation later, that should happen through metadata fields already emitted by the orchestrator, not by introducing a second decision engine.

### No New Service Rule

`v014` must stay inside the existing `control-api + search-gateway` shape.

No new readiness service, planning service, or evidence broker should be introduced in this round.

## Data Flow

The intended end-to-end flow is:

1. `packages/config-center` evaluates route readiness from project binding, plugin instance, secret reference presence, and route requirements.
2. `services/control-api` exposes that readiness to operators through a read-oriented API surface.
3. `services/search-gateway` consumes the same readiness model and translates it into a `RetrievalPlan`.
4. `search-gateway` executes candidate attempts in order, while explicitly recording blocked omissions and degraded fallbacks.
5. `search-gateway` emits `RetrievalOutcome` and `EvidenceAcquisitionMeta`.
6. the evidence metadata consumer records the acquisition facts and does not reinterpret readiness.

## Error And Decision Handling

`v014` is not mainly an error-contract project, but it still needs clear decision semantics.

Rules:

1. missing readiness information must be treated as a modeled blocker, not as an implicit empty route list
2. blocked routes must create omission records
3. degraded routes must carry penalty or warning context into planning and attempt metadata
4. evidence metadata must preserve the route status at the time of attempt
5. operator and runtime views must use the same status vocabulary

This prevents the common failure mode where the operator surface says one thing and the executor silently does another.

## Testing Strategy

Implementation should be TDD-driven after this spec is approved.

Minimum test layers:

1. contract tests for shared object schemas and status enums
2. core readiness tests for:
   - route evaluation
   - source aggregation
   - blocker and warning explanation mapping
3. `control-api` read-surface tests for readiness payloads
4. `search-gateway` orchestration tests for:
   - candidate ordering
   - degraded fallback
   - blocked omission recording
   - outcome emission
5. evidence metadata consumer tests for metadata pass-through and interpretation boundaries

## Future Implementation Batches

This design should be implemented in four controlled batches.

### Batch 1: `contracts + config-center core`

Scope:

- formalize shared contracts
- implement readiness core in `packages/config-center`
- add validators and translators for:
  - `SourceReadiness`
  - `RouteReadiness`
  - readiness aggregation

Non-goals:

- no HTTP API yet
- no orchestration executor yet
- no evidence consumer adoption yet

### Batch 2: `control-api` readiness API

Scope:

- expose readiness through read-only `control-api` endpoints
- make `control-api` the operator-facing authoritative surface

Non-goals:

- no runtime orchestration changes yet
- no evidence metadata changes yet

### Batch 3: `search-gateway` orchestration adoption

Scope:

- build `RetrievalPlan`
- execute `RetrievalAttempt`
- emit `RetrievalOutcome`
- make omission and fallback behavior explicit

Non-goals:

- no new crawler family rollout
- no scheduler or workflow engine

### Batch 4: evidence metadata consumer adoption

Scope:

- ingest `EvidenceAcquisitionMeta`
- preserve acquisition facts for downstream evidence use

Non-goals:

- no new decision engine in the evidence layer
- no re-evaluation of readiness in the consumer

## Acceptance Signals

The `v014` design is correctly implemented only when all of the following become true:

1. operators can read one consistent readiness model for a source and its routes
2. `search-gateway` consumes that same model instead of inventing route heuristics ad hoc
3. blocked routes are explicitly recorded as omissions
4. degraded routes are modeled as penalized fallback candidates rather than hidden failures
5. evidence acquisition metadata records what happened without re-deciding why

## Final Summary

`v014` should not be treated as two unrelated projects.

It is one umbrella design:

- readiness explains what is usable
- orchestration decides what to try
- evidence metadata records what actually happened

That is the narrowest design that closes the current internal gap without widening back into external smoke, new crawler expansion, or new platform services.
