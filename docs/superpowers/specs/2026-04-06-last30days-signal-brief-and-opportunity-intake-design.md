# Last30Days Signal Brief And Opportunity Intake Design

## Context

As of 2026-04-06, OpenFons already has a bounded compile chain:

- `OpportunityInput -> OpportunitySpec`
- `OpportunitySpec -> TaskSpec / WorkflowSpec`
- `TopicRun / SourceCapture / CollectionLog -> EvidenceSet`
- `ReportSpec -> Artifact`

What is still relatively thin is the layer before compile freeze:

- recent signal discovery
- cross-source convergence
- comparison-first topic narrowing
- deciding whether a topic should go straight into compile or first pass through a recent-signal brief

The `last30days-skill` reference is valuable here because it is strong at:

- recent multi-source research
- comparison mode
- progressive source unlocking
- identifying convergence across community, social, video, and web sources

The correct adaptation for OpenFons is not to replace the truth chain. The correct adaptation is to add a lightweight planning sub-layer inside `OpportunitySpec`.

## Design Goal

Add two internal `OpportunitySpec` subobjects:

1. `planningSignalBrief`
2. `intakeProfile`

These subobjects improve the planning stage without introducing a new external contract parallel to `OpportunitySpec`.

## Why These Stay Inside OpportunitySpec

The current SoT already says:

- `OpportunitySpec` is the only external planning contract for downstream consumers
- `DemandResearchBrief`, `OpportunityMap`, and similar objects should remain internal fields or subobjects

This means a `last30days`-inspired planning layer should be absorbed as internal structure, not exposed as a second top-level contract.

## planningSignalBrief

`planningSignalBrief` is a recent-signal planning object. It is not evidence and not a final conclusion.

Its job is to answer:

- what recent time window are we using
- are we in comparison mode
- which entities are likely being compared or watched
- which source families should be checked first
- what signal families should the planning pass care about

Recommended fields:

- `lookbackDays`
- `comparisonMode`
- `candidateEntities`
- `sourceCoverage`
- `signalFamilies`
- `briefGoal`

This is inspired by the `last30days-skill` source mix, but expressed in OpenFons-native structured form.

## intakeProfile

`intakeProfile` is the planning-side answer to:

- what kind of opportunity is this
- should it move directly into compile
- or should it first pass through a recent-signal research slice

Recommended fields:

- `intakeKind`
  - `comparison`
  - `single-subject`
  - `trend-watch`
  - `problem-investigation`
- `researchMode`
  - `direct-compile`
  - `last30days-brief`
  - `hybrid`
- `primaryDecision`
- `acceptedDelivery`
- `notes`

## Recommended Runtime Behavior

### 1. buildOpportunity should attach both subobjects

This gives every new `OpportunitySpec` a stable planning footprint without changing the compile happy path.

### 2. compile should remain unchanged for now

The current compile chain should not block on `planningSignalBrief`. That object is planning context, not evidence truth.

### 3. later phases can use these fields for:

- recent-signal pass selection
- source coverage diagnostics
- comparison-mode UI hints
- deciding whether to run `search-gateway` in a broader discovery mode before compile

## Minimal Initial Source Mix

The initial source mix should be small and opinionated:

- `web`
- `reddit`
- `hacker-news`
- `youtube`
- `x`
- `polymarket` only when obviously relevant

This follows the same principle as the reference project:

- start with useful public sources
- unlock more source types when the topic truly demands them

## Integration Boundary

The key boundary is:

- `planningSignalBrief` helps decide what to research next
- `EvidenceSet` remains the only truth path for report claims

That means:

- signal brief items are planning context
- they can justify a direction change or angle choice
- they cannot by themselves justify a report claim

## Outcome

This adaptation gives OpenFons a proper `last30days`-style upstream planning layer without breaking the existing architecture. The result is:

- stronger comparison discovery
- better recent-signal awareness
- better intake routing
- no violation of the rule that `OpportunitySpec` remains the only external planning contract
