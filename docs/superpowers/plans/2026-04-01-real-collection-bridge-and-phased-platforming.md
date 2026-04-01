# Real Collection Bridge And Phased Platforming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the first `AI procurement` case with real search-driven collection, then introduce `Source`, `doctor`, and `setup` only when the chain has earned the abstraction.

**Architecture:** Keep the current OpenFons truth chain unchanged. First add a narrow bridge from `SearchGateway` discovery outputs into real collection outputs for the existing `AI procurement` case. For phase 1, keep the runtime in-process: `control-api` should call an injected search client backed by current workspace code, not introduce a hard cross-service HTTP dependency between `control-api` and `search-gateway-service`. After that bridge is stable, extract the shared capture interface into `Source v0`, then add diagnostics as `doctor v0`, and only then productize first-run setup as `setup v0`.

**Tech Stack:** TypeScript, Zod, Hono, React, Vitest, pnpm

---

## File Map

- Modify: `services/control-api/src/compiler.ts`
  Add an injected real-collection path ahead of the current deterministic case bundle.
- Modify: `services/control-api/src/app.ts`
  Add the compile-time wiring needed to call the bridge.
- Modify: `services/control-api/src/cases/ai-procurement.ts`
  Reduce the current hand-written deterministic bundle to a fallback or fixture role.
- Create: `services/control-api/src/collection/real-collection-bridge.ts`
  Map `SearchGateway` outputs into real `TopicRun / SourceCapture / CollectionLog / EvidenceSet` inputs for the first case only.
- Create: `services/control-api/src/collection/search-client.ts`
  Hold the minimal SearchGateway client and request helpers, backed by in-process runtime wiring for phase 1.
- Create: `services/control-api/src/collection/capture-runner.ts`
  Execute the first real capture path for selected URLs and normalize outputs.
- Test: `tests/integration/control-api.test.ts`
  Cover compile success with real-collection bridge and fallback behavior.
- Create: `packages/contracts/src/source.ts`
  Define `Source`, `SourceTier`, and `HealthCheckResult` only after the real bridge stabilizes.
- Create: `packages/contracts/src/source-registry.ts`
  Provide minimal registration and lookup for `Source v0`.
- Modify: `packages/contracts/src/index.ts`
  Export `Source v0` contracts only when phase 2 starts.
- Create: `services/control-api/src/sources/registry.ts`
  Hold the first source registrations used by the bridge.
- Create: `services/control-api/src/sources/http-page-source.ts`
  Implement the first general page capture source.
- Create: `services/control-api/src/sources/community-thread-source.ts`
  Implement the first community-thread capture source if needed by the case.
- Test: `tests/contract/source-schema.test.ts`
  Cover `Source v0` contracts.
- Test: `tests/integration/source-registry.test.ts`
  Cover source registration and source selection.

- Create: `services/control-api/src/routes/health.ts`
  Add source and provider diagnostics only after `Source v0` exists.
- Modify: `services/control-api/src/app.ts`
  Mount the health routes in phase 3.
- Create: `services/control-api/src/doctor/report.ts`
  Build a compact diagnostic summary for CLI and API reuse.
- Create: `services/control-api/src/cli/doctor.ts`
  Provide a minimal terminal doctor entrypoint after diagnostics are stable.
- Test: `tests/integration/doctor.test.ts`
  Cover health and doctor responses.

- Create: `apps/control-web/src/pages/setup.tsx`
  Add a first-run setup page only after doctor output and configuration rules are stable.
- Create: `apps/control-web/src/pages/health.tsx`
  Show provider/source status after phase 3 is done.
- Create: `services/control-api/src/routes/setup.ts`
  Expose setup prerequisites and completion state if needed.
- Test: `tests/smoke/control-web-setup.test.tsx`
  Cover the minimal setup and health UI.

---

## Decision Table

| Phase | Start When | Do Not Start Before | Main Output | Stop If |
|------|------------|---------------------|-------------|---------|
| 1. Real Collection Bridge | `SearchGateway` is available and the first case still depends on hand-written captures | Before the current deterministic case can be reproduced by search + capture | One real `AI procurement` compile chain | We need a second case before the first one is stable |
| 2. Source v0 | One real collection bridge works end-to-end and capture logic is about to be reused | Before a real bridge exists | Shared capture abstraction | The abstraction is only serving one internal caller and keeps changing daily |
| 3. Doctor v0 | Real providers, credentials, and dependencies are causing repeated debugging friction | Before `Source v0` exists | Diagnostic API + CLI summary | There are no recurring runtime failures to diagnose |
| 4. Setup v0 | Doctor output and minimum required config have stabilized across at least 2-3 fresh setup attempts | Before doctor signals are trustworthy | First-run onboarding flow | Setup steps are still changing every few days |

---

## Milestone Signals

### Phase 1: Real Collection Bridge

**Start signals**
- `services/control-api/src/cases/ai-procurement.ts` still hand-writes `SourceCapture` and `Evidence`.
- `packages/search-gateway/src/gateway.ts` already returns `SearchRun / SearchResult / UpgradeCandidate`.
- The team agrees the next milestone is real collection, not persistence or a second case.

**Scope boundary**
- Phase 1 real collection means: search for candidate URLs, select the first case's allowed targets, fetch/capture live page data through a narrow runner, and convert that into real `SourceCapture / CollectionLog`.
- Phase 1 does not mean: full browser automation platform, full collector service, full multi-source plugin system, or broad source abstraction.
- Unless a case requirement proves otherwise, the first capture path should prefer simple live HTTP capture plus normalization over browser-heavy collection.

**Done signals**
- Compile for the first case can call search, select targets, run real capture, and emit real `TopicRun / SourceCapture / CollectionLog`.
- Deterministic data is kept only as explicit fallback, fixture, or test input.
- At least one integration test proves compile works without the old hand-written capture bundle as the primary path.

**Debt avoided by doing it now**
- Prevents copy-pasting case-specific fake captures into future cases.
- Prevents `SearchGateway` and evidence-chain code from drifting apart.

### Phase 2: Source v0

**Start signals**
- The real bridge has at least one stable capture path.
- A second capture path is clearly needed, or the first path already has duplicated capture logic.
- The team can now name the minimum common interface from observed code instead of guessing it.

**Done signals**
- Shared capture logic moves behind a small `Source` interface.
- The first bridge uses `SourceRegistry` instead of case-owned ad hoc capture branching.
- The abstraction stays narrow: capture, can-handle, health-check. No broad platform rewrite.

**Debt avoided by doing it now**
- Prevents capture logic duplication before the second case or persistence work starts.
- Prevents the first bridge from becoming a one-off internal mini-framework.

### Phase 3: Doctor v0

**Start signals**
- Developers repeatedly ask why a provider or dependency is failing.
- Runtime config differs across machines or environments.
- Missing credentials or degraded providers are slowing real runs.

**Done signals**
- There is one diagnostic view for provider status, source health, and missing config.
- API and CLI use the same diagnostic report builder.
- The team can answer “what is broken in this environment?” without reading code or logs first.

**Debt avoided by doing it now**
- Prevents ad hoc troubleshooting scripts and hidden environment knowledge.
- Prevents every new machine or worktree from requiring manual detective work.

### Phase 4: Setup v0

**Start signals**
- The minimum config path has stabilized after real use.
- Doctor can reliably explain what is missing.
- The system is ready for repeated fresh-machine or fresh-user setup.

**Done signals**
- First-run setup helps the user get to a healthy state faster.
- Setup is driven by the same health/config truth used by doctor.
- Setup is intentionally thin: guide and validate, not hide unstable internals.

**Debt avoided by doing it now**
- Prevents baking unstable setup steps into UI too early.
- Prevents setup and doctor from drifting into two inconsistent sources of truth.

---

## Sequence Rules

1. Phase 1 must finish before any formal `Source` abstraction work starts.
2. Phase 2 must start before a second case or persistence project reuses capture logic.
3. Phase 3 should start as soon as environment failures become repetitive, but after `Source v0` establishes what is being diagnosed.
4. Phase 4 should start only after phase 3 outputs are stable enough to drive onboarding.

---

## Execution Order

### Task 1: Build the narrow real-collection bridge first

**Files:**
- Create: `services/control-api/src/collection/real-collection-bridge.ts`
- Create: `services/control-api/src/collection/search-client.ts`
- Create: `services/control-api/src/collection/capture-runner.ts`
- Modify: `services/control-api/src/compiler.ts`
- Modify: `services/control-api/src/app.ts`
- Modify: `services/control-api/src/cases/ai-procurement.ts`
- Test: `tests/integration/control-api.test.ts`

- [ ] Define the compile boundary so `buildCompilation()` can call a bridge without teaching `compiler.ts` about search internals.
- [ ] Keep phase 1 wiring in-process through an injected search client adapter instead of introducing a mandatory HTTP hop to `search-gateway-service`.
- [ ] Make the bridge consume `SearchGateway` outputs and emit real `TopicRun / SourceCapture / CollectionLog` data for the first case only.
- [ ] Keep the deterministic bundle only as an explicit fallback path that is visible in tests and logs, never as a silent substitute for a failed real bridge.
- [ ] Add one integration test for real-bridge success and one for fallback behavior.

### Task 2: Extract `Source v0` at the first proven reuse point

**Files:**
- Create: `packages/contracts/src/source.ts`
- Create: `packages/contracts/src/source-registry.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `services/control-api/src/sources/registry.ts`
- Create: `services/control-api/src/sources/http-page-source.ts`
- Create: `services/control-api/src/sources/community-thread-source.ts`
- Test: `tests/contract/source-schema.test.ts`
- Test: `tests/integration/source-registry.test.ts`

- [ ] Extract only the shared parts observed in the real bridge: `canHandle`, `capture`, and `healthCheck`.
- [ ] Register the first sources through a small registry instead of open-ended service discovery.
- [ ] Move case-independent capture code from the bridge into the first sources.
- [ ] Refuse to add platform-wide setup, persistence, or plugin concerns in this phase.

### Task 3: Add `doctor v0` once runtime debugging becomes repetitive

**Files:**
- Create: `services/control-api/src/routes/health.ts`
- Create: `services/control-api/src/doctor/report.ts`
- Create: `services/control-api/src/cli/doctor.ts`
- Modify: `services/control-api/src/app.ts`
- Test: `tests/integration/doctor.test.ts`

- [ ] Build one diagnostic report that merges provider status, source health, and missing config.
- [ ] Expose the same report through API first, then CLI.
- [ ] Keep the output compact and actionable: healthy, degraded, missing, and why.
- [ ] Avoid adding dashboard UI before the report shape is stable.

### Task 4: Add `setup v0` only after doctor stabilizes

**Files:**
- Create: `apps/control-web/src/pages/setup.tsx`
- Create: `apps/control-web/src/pages/health.tsx`
- Create: `services/control-api/src/routes/setup.ts`
- Test: `tests/smoke/control-web-setup.test.tsx`

- [ ] Use doctor output as the single source of truth for setup requirements.
- [ ] Build a thin first-run guide that validates prerequisites and explains next actions.
- [ ] Keep setup explicit about credentials, dependencies, and optional upgrades.
- [ ] Avoid auto-magic behavior that the doctor layer cannot explain.

---

## Guardrails

- Do not let `SearchGateway` directly create `EvidenceSet`.
- Do not introduce a broad `Source` platform before one real bridge has stabilized.
- Do not let `control-api` take a hard runtime dependency on `search-gateway-service` network calls in phase 1 when the same workspace code can be injected directly.
- Do not allow silent fallback from real collection to deterministic bundle; fallback must be explicit, observable, and test-covered.
- Do not start persistence work until the first real run shape is trustworthy.
- Do not build setup UI before diagnostic signals are stable enough to drive it.
- If a second case is requested before phase 2 starts, pause and extract `Source v0` first.

---

## Recommended Go / No-Go Decisions

- **Go to Phase 2** when the first real bridge works and reuse pressure appears.
- **Do not go to Phase 2** if the real bridge API is still changing every day.
- **Go to Phase 3** when repeated runtime debugging becomes a team tax.
- **Do not go to Phase 4** until the doctor output is the agreed source of truth for setup.
