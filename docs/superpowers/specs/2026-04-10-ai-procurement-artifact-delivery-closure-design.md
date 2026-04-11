# AI Procurement Artifact Delivery Closure Design

## Context

OpenFons already has an evidence-backed AI procurement compile chain:

- `buildCompilation()` can produce `OpportunitySpec`, `TopicRun`, `SourceCapture`, `EvidenceSet`, and `ReportSpec`
- `control-api` can return a `ReportView`
- `report-web` can render that `ReportView`
- workbench exporters can generate standalone HTML artifacts from the same report truth

What is still missing is a formal delivery closure inside the main compile path.

Today the compile result still records the report artifact as:

```text
memory://report/<reportId>
```

That means the mainline can prove an in-memory report and a UI view, but it does not yet prove that a successful compile also yields a formal file-backed deliverable.

## Problem Statement

The current gap is not evidence collection and not report rendering. The gap is delivery finalization.

The system still lacks:

- a formal output directory for compile-generated report artifacts
- a stable file-backed artifact URI in `CompilationResult.artifacts`
- a clear boundary between pure HTML rendering and artifact file delivery
- failure semantics that treat artifact write failures as compile failures

As a result, the current system can say "the report exists in memory" but cannot yet say "the report was formally delivered as a generated artifact."

## Approaches Considered

### Approach A: Keep compile in-memory and require a separate export command

This is the smallest implementation change because it can reuse the existing export scripts. But it does not actually close the delivery gap.

Result: rejected. It preserves a two-step workflow where `compile` success still does not mean "deliverable exists."

### Approach B: Generate the formal report artifact in the formal compile entrypoint for the current AI procurement case

This keeps the current evidence-backed compile truth intact while avoiding hidden side effects in every `buildCompilation()` caller.

Successful formal compile would then mean:

1. in-memory `ReportView` is available
2. a formal file-backed report artifact was written

Result: recommended. It is the smallest path that closes the real gap without widening into a generic artifact platform too early.

### Approach C: Build a generic multi-format artifact platform first

This would try to solve HTML, deck, PDF, manifest, retention, and broader case coverage in one phase.

Result: rejected for this batch. It is too large and would delay the current formal closure for the single highest-value path.

## Design Goals

1. Make successful AI procurement compile produce a formal file-backed report artifact.
2. Keep the artifact path stable and repo-relative.
3. Keep `report-web` and the current API read path working without requiring direct file reads.
4. Separate pure HTML rendering from file delivery responsibilities.
5. Keep the pure compilation builder side-effect-free for non-delivery callers such as workbench exporters and tests.
6. Keep the first batch intentionally narrow: AI procurement report HTML only.

## Non-Goals

1. This phase does not convert `OpenClaw` workbench exports into the same pipeline.
2. This phase does not build a generic artifact platform for every `ReportView`.
3. This phase does not add deck, PDF, ZIP, or manifest outputs.
4. This phase does not make `report-web` load artifacts from disk.
5. This phase does not add an artifact serving API, retention policy, or cleanup scheduler.

## Recommended Scope

The first delivery closure batch should be limited to the current AI procurement compile path.

On successful compile, the system must now produce:

- the existing in-memory `CompilationResult` and `ReportView`
- one formal HTML file artifact under a repo-owned generated directory

Recommended output path:

```text
artifacts/generated/ai-procurement/<report-slug>-<report-id>/report.html
```

The artifact URI stored in `CompilationResult.artifacts` should be the repo-relative path, not an absolute machine path and not `memory://...`.

## Output Directory Model

The generated artifact root for this phase should be:

```text
artifacts/
  generated/
    ai-procurement/
      <report-slug>-<report-id>/
        report.html
```

Why this location:

- it separates formal delivery artifacts from `docs/workbench/generated/**`
- it keeps runtime-generated outputs outside the documentation tree
- it preserves room for future case families without forcing a full platform abstraction now

The generated directory should be treated as runtime output and ignored by both Git and Docker build context in this phase.

Repo-relative artifact URIs should be normalized to forward-slash form on every platform:

```text
artifacts/generated/ai-procurement/<report-slug>-<report-id>/report.html
```

not:

```text
artifacts\generated\ai-procurement\<report-slug>-<report-id>\report.html
```

## Artifact Model

The current contract model already supports `Artifact.storage = 'memory' | 'file'`.

This phase should start using the existing file storage mode for the main AI procurement report artifact:

- `type: 'report'`
- `storage: 'file'`
- `uri: 'artifacts/generated/ai-procurement/<report-slug>-<report-id>/report.html'`

The current domain-model artifact factory hardcodes `storage: 'memory'`. That boundary must be widened so the compile path can create a real file-backed artifact without bypassing the artifact model.

For minimal scope, the pure builder may continue to construct a provisional in-memory report artifact internally if contract compatibility requires it. But the formal compile entrypoint must replace that provisional artifact with the file-backed artifact before persistence and before the HTTP response is returned.

## Component Boundaries

The implementation should keep rendering and delivery separate.

### 1. Pure renderer stays in `report-export`

Keep:

```text
services/control-api/src/report-export/static-html.ts
```

Responsibilities:

- input: `ReportView`
- output: HTML string
- no path resolution
- no directory creation
- no file writes

This module remains a pure presentation renderer.

### 2. Add a small artifact delivery slice

Recommended location:

```text
services/control-api/src/artifacts/
```

Recommended responsibilities:

- `paths.ts`
  - build stable repo-relative output paths for generated artifacts
- `report-view.ts`
  - build a `ReportView` from compile outputs in one place
- `delivery.ts`
  - accept a pure compilation result
  - render and write the formal file artifact
  - return a finalized compilation result with file-backed artifact metadata
- `report-html.ts`
  - render report HTML from `ReportView`
  - write the file atomically
  - return the resulting `Artifact`

This keeps file delivery logic out of both the compiler and the renderer.

### 3. Separate the formal compile entrypoint from the pure builder

`buildCompilation()` is currently reused by:

- the formal `control-api` compile route
- workbench exporters
- tests and helper flows that only need report data

That means artifact delivery should not be attached to every `buildCompilation()` call.

Recommended rule:

- `buildCompilation()` remains side-effect-free
- the formal compile route, or a dedicated compile-delivery service called by that route, performs artifact delivery
- non-API callers keep using the pure builder and do not generate formal runtime artifacts by default

This preserves a clean distinction between:

- "compute report truth"
- "deliver formal artifact"

### 4. Remove duplicated `ReportView` assembly

Today `store.ts` reconstructs `ReportView` from `CompilationResult`, while compile-related exporters assemble equivalent structures elsewhere.

That drift risk should be reduced by introducing one shared helper that converts compile output into `ReportView`.

### 5. Persist formal artifact metadata in-process

This phase should not leave artifact metadata visible only in the single compile response.

Recommended minimum:

- extend the in-memory store to retain the finalized `CompilationResult`, or at least a reportId-keyed artifact index derived from it
- continue exposing `ReportView` through the current report route
- keep artifact metadata queryable inside the current service process for later extension and debugging

This phase still does not need a new artifact API, but it should not drop formal artifact metadata immediately after the response is sent.

## Compile-Time Data Flow

The recommended formal compile flow is:

1. The compile route calls pure `buildCompilation()` to assemble the normal evidence-backed result:
   - `opportunity`
   - `tasks`
   - `workflow`
   - `topicRun`
   - `sourceCaptures`
   - `collectionLogs`
   - `evidenceSet`
   - `report`
2. Build a canonical `ReportView` from those objects.
3. Call the artifact delivery layer from the formal compile entrypoint:
   - resolve the artifact path
   - render the HTML
   - write `report.html`
   - replace the provisional in-memory report artifact, if present, with one file-backed `Artifact`
4. Persist the finalized compilation result in the app store.
5. Return the finalized compile result.
6. Derive and save `ReportView` only after artifact delivery succeeds.

This keeps the delivery side effect explicit and inside the compile success boundary.

## Failure Handling

Artifact delivery failures should be treated as infrastructure failures, not policy failures.

Recommended rules:

- if `ReportView` assembly fails, compile fails
- if HTML rendering fails, compile fails
- if directory creation or file write fails, compile fails
- if artifact delivery fails, no partial artifact metadata should be returned
- if compile fails before returning, the app store must not persist the `ReportView`

Existing business error behavior should remain unchanged:

- unsupported topic: `409`
- insufficient evidence: `422`
- runtime discovery/capture fallback: existing behavior remains

Artifact write failure is a delivery-layer error and should surface as a server failure, not as a policy error.

## Atomic Write Strategy

File writes should avoid half-written artifacts.

Recommended flow:

1. create the target directory if missing
2. write HTML to `report.html.tmp`
3. atomically rename or replace to `report.html`
4. best-effort remove leftover temp files on failure

This keeps the artifact directory safe for repeated runs and test assertions.

## Idempotency Rules

The output path should be deterministic for a given `report.id`.

Rules:

- same `report.id` -> same output directory
- repeated write for the same `report.id` overwrites the same `report.html`
- new compile run -> new `report.id` -> new output directory
- artifact URI always stores the normalized repo-relative path using `/`

This phase should not add a sidecar manifest. `CompilationResult.artifacts` remains the source of truth for artifact metadata.

## Store And UI Invariants

This phase should not change the read path for the current UI.

Keep:

- `control-api` stores the finalized compilation metadata in memory after successful compile
- `control-api` derives and stores `ReportView` after successful artifact delivery
- `/api/v1/reports/:reportId` still returns that in-memory `ReportView`
- `report-web` still fetches the report via API

That means the new file artifact is a formal delivery output, not a replacement for the current UI path.

This phase does not add a new artifact query route, but the artifact metadata should remain available in-process instead of existing only inside the original compile response payload.

## Testing Strategy

### 1. Artifact path tests

Cover:

- stable repo-relative path generation
- expected directory convention for AI procurement outputs
- forward-slash normalization on Windows and non-Windows hosts

### 2. Contract and domain-model regression tests

Cover:

- `Artifact` schema expectations updated from `memory://report/...` to file-backed report artifact in the finalized compile path
- domain-model artifact factory or equivalent helper accepts explicit storage mode for file-backed artifacts

### 3. Artifact delivery tests

Cover:

- render `ReportView` into HTML
- write `report.html` into a temporary repo-root fixture
- return `Artifact` with `storage: 'file'`

### 4. Compiler integration tests

Cover:

- the formal compile route writes a formal HTML artifact
- `CompilationResult.artifacts` no longer uses `memory://report/...`
- generated HTML contains key evidence-backed report sections
- finalized compilation metadata remains available in the store after the response path completes

### 5. Failure-path tests

Cover:

- simulated write failure causes compile failure
- no `ReportView` is saved to the store when compile fails during artifact delivery
- no half-written `report.html` survives after failure

### 6. Regression tests

Cover:

- non-API callers that use pure `buildCompilation()` remain side-effect-free
- existing `control-api` compile tests remain green
- existing `report-web` smoke tests remain green
- existing workbench export tests remain green
- `.gitignore` and `.dockerignore` exclude `artifacts/generated/**`

## Acceptance Signals

This phase is complete when all of the following are true:

1. AI procurement compile success produces a real `report.html` under `artifacts/generated/ai-procurement/**`.
2. `CompilationResult.artifacts` records a file-backed artifact with a repo-relative URI.
3. `report-web` still renders the compiled report through the current API path.
4. Artifact write failures fail compile instead of silently returning an in-memory-only success.
5. The change does not pull `OpenClaw` or broader export surfaces into the same batch.

## Final Summary

The recommended next step for OpenFons is not more crawler work and not a broad artifact platform.

It is a narrow but important closure:

- keep the current AI procurement truth chain
- keep the current report renderer
- add a dedicated artifact delivery layer at the formal compile entrypoint
- keep the pure builder side-effect-free for non-delivery callers
- make successful formal compile produce one formal file-backed HTML report and retain its metadata in-process

That is the smallest change that turns the current mainline from "renderable in memory" into "formally delivered as an artifact."
