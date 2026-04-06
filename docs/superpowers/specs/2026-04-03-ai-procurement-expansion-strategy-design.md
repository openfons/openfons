# AI Procurement Expansion Strategy Design

## Context

As of 2026-04-03, OpenFons has completed the first real `AI procurement` compile chain on top of the formal `DuckDuckGo / DDGS` search route. PR #11 merged the real-collection path into `main`, which means the current bottleneck is no longer "can we run a live compile?" but "how do we safely widen the first case from one fixed comparison into a reusable, evidence-backed opportunity intake surface?"

The next phase should not jump straight into a broad platform rewrite. The repo now has enough signal to define a tighter operating strategy: widen the first case inside the `AI procurement` domain, lock down acceptance standards, and only then introduce reuse layers when the live chain has actually earned them.

## Problem Statement

The current first case still behaves like a curated proof: it can compile one real, live `AI procurement` report, but the surrounding product rules are still underspecified. If we widen inputs too aggressively, we risk silently turning the first case into a fuzzy general search product. If we platformize too early, we risk building `persistence` or `OpenClaw` around assumptions that have not been validated by repeat live runs.

The design problem for this phase is therefore:

1. Expand from one fixed "Direct API vs OpenRouter" comparison to a bounded set of real `AI procurement` opportunity inputs.
2. Keep the truth chain stable enough that every accepted input still compiles into verifiable `OpportunitySpec`, `EvidenceSet`, and `ReportSpec`.
3. Decide the reuse order for `persistence` and `OpenClaw` based on observed pressure, not architecture aesthetics.

## Goals

- Expand the first case from a single fixed comparison to a bounded `AI procurement` intake family.
- Define what counts as an in-scope `AI procurement` input and what must still be rejected.
- Define acceptance signals for compile success, evidence quality, fallback behavior, and unsupported behavior.
- Decide when `persistence` becomes justified and when `OpenClaw` becomes justified.
- Preserve the existing truth chain and keep `real collection` as the primary path.

## Non-Goals

- This phase does not add a second domain outside `AI procurement`.
- This phase does not turn OpenFons into a general web research engine.
- This phase does not start `OpenClaw`-driven authenticated capture by default.
- This phase does not add setup UI or diagnostics-first product surfaces unless the later phases require them.
- This phase does not weaken unsupported compile guards just to accept more inputs.

## Assumptions

- The merged phase-1 bridge is now the required baseline: live compile should use the real collection path first and deterministic data only as an explicit fallback.
- The best next move is to harden product boundaries before extracting more infra.
- We should optimize for repeatable evidence quality, not for maximum source count.

## Approaches Considered

### Approach A: Keep the first case narrow and only harden the current fixed comparison

This approach treats the post-merge state as nearly complete. We would mostly polish the existing `Direct API vs OpenRouter` path, tighten tests, and delay any wider intake strategy until a later round.

Pros:
- Lowest short-term delivery risk.
- Minimal new surface area.
- Easy to reason about.

Cons:
- Does not prove that the chain can handle real opportunity intake beyond one hand-picked comparison.
- Delays the product decision we actually need next: what inputs qualify as a valid `AI procurement` opportunity.
- Risks overfitting the system to one report shape.

### Approach B: Expand within a bounded `AI procurement` intake taxonomy, then introduce reuse only after repeated live pressure

This approach widens the first case, but only inside a carefully defined taxonomy of `AI procurement` questions. It adds explicit intake rules, evidence expectations, unsupported reasons, and trigger conditions for later infra work. `Persistence` is deferred until rerun economics demand it. `OpenClaw` is deferred until controlled-access or browser-heavy capture is genuinely needed.

Pros:
- Best balance of product learning and implementation discipline.
- Produces clearer acceptance criteria for future live runs.
- Lets reuse layers emerge from observed pressure instead of speculation.

Cons:
- Requires more product definition work now.
- May expose gaps in target templates and evidence normalization that were hidden by the single-case proof.

### Approach C: Platformize first with `persistence` and `OpenClaw`, then widen inputs

This approach assumes the main risk is infrastructure depth. We would build storage, rerun support, and richer capture capability before widening the first case input family.

Pros:
- High apparent reuse potential.
- Prepares for more demanding capture scenarios.

Cons:
- Most likely to lock in the wrong abstractions.
- Solves future problems before the present product boundary is stable.
- Pushes product validation behind platform work.

## Recommended Approach

Choose **Approach B**.

It gives OpenFons the next missing capability: accepting a bounded family of real `AI procurement` opportunities while preserving the truth chain and keeping unsupported cases explicit. It also gives us an evidence-based answer to the reuse question:

- **`persistence` should come before `OpenClaw`, but only after repeated live reruns make storage economically and operationally necessary.**
- **`OpenClaw` should remain opt-in and later, reserved for sources that truly require controlled session state or browser-heavy interaction.**

## Recommended Design

### 1. Define the first expandable intake family

The first case should stop being framed as one fixed comparison and start being framed as a bounded `AI procurement` opportunity family.

Accepted input families:

1. Vendor choice questions
   Example shapes:
   - Direct API vs router
   - Vendor A vs Vendor B for a defined workload
   - Single-vendor suitability for a specific team or use case
2. Pricing and access questions
   Example shapes:
   - pricing changes
   - credits / billing model differences
   - model availability by plan or channel
3. Capability procurement questions
   Example shapes:
   - feature availability
   - model support and restrictions
   - rate limit / throughput / regional access constraints when first-party evidence exists

Rejected for now:

- Pure model quality benchmarking without procurement consequences
- Pure prompt engineering questions
- Fully operational "how to deploy" questions
- Inputs that require authenticated/private evidence to reach a useful answer
- Broad multi-domain market scans outside the `AI procurement` boundary

This keeps the scope on purchasable or subscribable decisions, which matches the current monetizable report direction.

### 2. Define evidence classes for accepted reports

Every accepted `AI procurement` report should be backed by a minimum evidence mix instead of an arbitrary source pile.

Required evidence classes:

1. **Primary first-party evidence**
   At least two captures from official vendor-controlled pages when the report compares multiple vendors, or at least one strong official capture for a single-vendor decision.
   Typical targets:
   - pricing pages
   - API docs
   - help center / platform docs
   - product announcements when they materially affect procurement
2. **Secondary real-world evidence**
   At least one community or issue-tracker source that reflects practitioner friction, limits, migration issues, or billing confusion.
   Preferred surfaces:
   - GitHub issues / discussions
   - vendor forums
   - Reddit / Hacker News only when concrete and attributable
3. **Interpretive comparison evidence**
   Optional, but allowed when clearly marked as supporting context rather than truth authority.
   Typical surfaces:
   - comparison articles
   - analyst commentary
   - review pages

Evidence rules:

- Final claims should never depend solely on community commentary when first-party evidence exists.
- Community evidence is used to expose operational reality, not to override official facts.
- Commentary-only pages cannot make a report compile on their own.

### 3. Define compile acceptance standards

The next phase should be considered successful only if accepted inputs meet all of the following signals.

Input acceptance:

- The input can be normalized into one of the accepted `AI procurement` families.
- The compiler can produce an `OpportunitySpec` with a concrete buyer decision, not just a vague topic.
- The system can identify at least one official target family and one real-world corroboration family before capture starts.

Runtime acceptance:

- Default live compile path returns `compileStatus = 200` and `reportStatus = 200`.
- `usedFallback = false` for the default happy path on supported inputs.
- Capture count and evidence count are sufficient to support every top-level claim; as an operating rule, supported reports should usually land with at least four usable captures and at least four evidence objects.
- Failures remain explicit. Unsupported or under-evidenced inputs must fail as unsupported or insufficient evidence, not silently degrade into a misleading report.

Output acceptance:

- `ReportSpec` preserves buyer framing, claims, risk boundary, update time, and evidence backlinks.
- The report makes the supported recommendation and the unsupported unknowns separately visible.
- Claims that rely on freshness-sensitive vendor facts must trace back to current official captures.

Observability acceptance:

- When the runtime falls back, the logs must say why.
- When the runtime rejects an input, the reason should map to a stable unsupported category rather than a generic error.

### 4. Define unsupported categories up front

To keep the expanded intake disciplined, unsupported outcomes should be categorized rather than improvised.

Recommended unsupported categories:

- `out_of_scope_domain`
  The request is not an `AI procurement` decision.
- `missing_official_targets`
  The system cannot identify strong vendor-controlled targets.
- `insufficient_public_evidence`
  The question depends on evidence that is private, gated, or unavailable publicly.
- `needs_authenticated_capture`
  The useful answer depends on login/session state and therefore exceeds the current public-capture boundary.
- `underspecified_buyer_decision`
  The request is too vague to compile into a concrete procurement question.

These categories should be reflected consistently in compiler behavior, tests, and control-web messaging.

### 5. Decide the reuse order

The recommended order is:

1. Harden the expanded intake family and evidence rules
2. Extract or stabilize shared source selection only where repetition is proven
3. Introduce **`persistence`**
4. Introduce **`OpenClaw`** only after a later trigger

#### Why `persistence` comes first

`Persistence` solves problems that benefit every live run once the first case begins to repeat:

- avoids recapturing unchanged vendor pages on every compile
- preserves rerun history for freshness and diff analysis
- gives the team an evidence inventory instead of one-shot run artifacts
- improves cost, speed, and explainability without widening capture scope

`Persistence` is justified when any of these signals appear:

- the same target families are being recaptured across multiple runs
- freshness comparisons become part of the report value
- repeated live runs create noticeable latency or cost pressure
- users need rerun traceability across time, not just one run snapshot

#### Why `OpenClaw` comes later

`OpenClaw` should not be treated as the default next step. It is only justified when public HTTP or lightweight browser capture can no longer support accepted `AI procurement` questions.

`OpenClaw` is justified when these signals appear:

- an otherwise valid `AI procurement` input consistently requires login/session state
- the important evidence sits behind controlled flows, rich app shells, or anti-bot boundaries that current capture cannot handle
- we have already proven that the source belongs in scope and cannot be served by a simpler public capture path

This makes `OpenClaw` a targeted capability for controlled capture, not a blanket replacement for the current bridge.

### 6. Rollout sequence

#### Phase A: Strategy hardening

Define intake families, unsupported categories, evidence quotas, and report acceptance rules in code and tests for the existing `AI procurement` case.

#### Phase B: Source reuse tightening

Only after repeated source patterns appear, extract the narrowest reusable capture/source selection layer needed by the first case. Do not broaden this into a plugin platform yet.

#### Phase C: Persistence

Add stored capture metadata, rerun traceability, and cache-aware reuse for repeated official and community targets.

#### Phase D: OpenClaw integration

Add controlled capture only for in-scope targets that have already proven impossible to serve through the lighter path.

## Testing Strategy

The next phase should be tested at three layers.

### Contract tests

- Accepted `AI procurement` inputs normalize into known intake families.
- Rejected inputs map to stable unsupported categories.
- Evidence requirements are encoded as explicit expectations, not comments.

### Integration tests

Maintain at least three canonical supported scenarios:

1. Direct API vs router procurement comparison
2. Pricing or access policy comparison
3. Single-vendor suitability decision with concrete procurement framing

Each scenario should prove:

- live target selection
- real capture path
- stable evidence mapping
- report compile without silent fallback

### Live verification

Keep one manual or semi-automated live smoke that runs without `DDG_ENDPOINT` and verifies:

- the happy path still uses the formal `DuckDuckGo / DDGS` route
- `usedFallback` remains false on the supported baseline
- evidence backlinks remain visible in the report artifact

## Risks And Mitigations

### Risk: Intake expansion becomes a disguised general research engine

Mitigation:
- Keep accepted families tied to procurement decisions
- Keep unsupported categories explicit
- Require official target families before compile

### Risk: Source diversity produces noisy, weak reports

Mitigation:
- Require primary first-party evidence
- Treat commentary as supplemental
- Fail closed when evidence mix is insufficient

### Risk: The team introduces infra too early

Mitigation:
- Gate `persistence` on rerun pressure
- Gate `OpenClaw` on proven controlled-capture need
- Keep Phase A and B focused on the existing case family

## Outcome

The correct next phase is not "build more platform." The correct next phase is to turn the first live `AI procurement` chain into a bounded, repeatable opportunity intake system with explicit evidence rules. Once that is stable, the reuse order becomes clear:

- `persistence` before `OpenClaw`
- and only when the live system has earned each layer
