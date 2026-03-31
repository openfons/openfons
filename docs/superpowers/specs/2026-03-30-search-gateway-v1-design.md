# OpenFons SearchGateway v1 Design

> Date: 2026-03-30
> Status: Draft for review
> Scope: Search discovery gateway for planning-stage search and evidence-stage补证据 search

## 1. Why This Design Exists

OpenFons has already frozen the main truth chain:

`User Input -> OpportunitySpec -> User Confirmation -> TaskSpec / WorkflowSpec -> TopicRun / SourceCapture / CollectionLog -> EvidenceSet -> ReportSpec -> Artifact`

That chain should not be replaced.

What is still missing is a reusable execution-layer search capability that:

1. can be used by planning-stage research
2. can be used again during evidence-stage补证据
3. is not locked inside one `skill`
4. can be called from `control-api`, future workers, future admin interfaces, and future skills through one gateway
5. preserves auditable discovery output without pretending that search results are already evidence

The goal of this design is to introduce `SearchGateway` as a new execution-layer capability while keeping the OpenFons truth model intact.

## 2. Main Decision

OpenFons should keep the main chain and truth rules unchanged, but refactor the execution layer to include:

`SuperAgent / Planner -> Gateway -> Provider Adapters -> Skills -> Sandbox -> Memory`

Within that execution layer, `SearchGateway` becomes the first concrete gateway capability to design.

The design choice is:

1. keep `OpportunitySpec / TaskSpec / WorkflowSpec / TopicRun / SourceCapture / CollectionLog / EvidenceSet` as the main truth chain
2. introduce `SearchGateway` as a discovery execution component, not as a replacement truth source
3. let `SearchGateway` support both:
   - planning-stage discovery search
   - post-confirmation evidence-stage补证据 search
4. let `SearchGateway` return discovery execution objects first, then upgrade selected results into formal collection objects later

## 3. Rejected Approaches

### 3.1 Lightweight Wrapper

Make one thin search wrapper that only normalizes provider responses.

Rejected because:

1. it would not cover provider capability matrix, credential policy, downgrade handling, or upgrade candidates
2. it would likely be rewritten once multi-provider orchestration is needed
3. it does not satisfy the requirement that the gateway be usable by more than just skills

### 3.2 Monolithic Search Service

Make one big service that owns search, collection, extraction, and evidence generation.

Rejected because:

1. it would collapse discovery, collection, and evidence qualification into one oversized execution box
2. it would blur the boundary between search results and truth artifacts
3. it would conflict with the evidence-first SoT and make later `CollectorGateway` design much harder

### 3.3 Layered Gateway Design

Use one shared capability package plus one service entrypoint:

1. `packages/search-gateway`
2. `services/search-gateway`

Recommended because:

1. internal code can call the package directly
2. external systems and future apps can call the service
3. skills become wrappers around gateway abilities instead of the only execution entrypoint
4. search remains separate from collection while still being able to trigger collection asynchronously

## 4. Scope Boundaries

### 4.1 In Scope

SearchGateway v1 must support:

1. both planning-stage discovery search and post-confirmation evidence-stage search
2. single-provider search and multi-provider search
3. provider aggregation, deduplication, and diagnostics
4. global default configuration plus task-level override
5. system-level credentials plus project-level override
6. provider capability matrix with operational metadata
7. domain/source-kind rule-based selection
8. automatic upgrade candidates plus human adjustment
9. synchronous search return with asynchronous collection trigger

### 4.2 Out Of Scope

SearchGateway v1 must not:

1. replace `CollectorGateway`
2. perform full browser capture or full content extraction by itself
3. write results directly into `EvidenceSet`
4. replace `OpportunitySpec` or `TaskSpec / WorkflowSpec`
5. become a general-purpose all-in-one crawling platform
6. become a memory truth source

## 5. Position In The Main Chain

SearchGateway has two insertion points in the main chain:

### 5.1 Planning-Stage Discovery Search

`User Input`
`-> Intent Structuring / Planning Swarm`
`-> SearchGateway (purpose = planning)`
`-> SearchRun / SearchResult / UpgradeCandidate`
`-> Opportunity Judge`
`-> OpportunitySpec`

This mode exists to support:

1. query expansion
2. cohort discovery
3. SERP structure understanding
4. disconfirming-question discovery

Its outputs are discovery execution objects, not final evidence.

### 5.2 Post-Confirmation Evidence Search

`User Input`
`-> Intent Structuring / Planning Swarm / Opportunity Judge`
`-> OpportunitySpec`
`-> User Confirmation`
`-> TaskSpec / WorkflowSpec`
`-> SearchGateway (purpose = evidence)`
`-> SearchRun / SearchResult / UpgradeCandidate`
`-> CollectorGateway`
`-> SourceCapture / CollectionLog`
`-> EvidenceSet`
`-> ReportSpec`
`-> Artifact`

This means:

1. `SearchRun` is not `TopicRun`
2. `SearchResult` is not `SourceCapture`
3. `UpgradeCandidate` is not `Evidence`
4. planning-mode `SearchRun` may exist without `workflowId / taskId`
5. only after collection and qualification do artifacts join the formal truth chain

## 6. Internal Layering

SearchGateway should be internally split into five layers:

1. `Request Layer`
   - validate and normalize `SearchRequest`
   - determine planning mode vs evidence mode
2. `Provider Orchestrator`
   - resolve providers from config
   - handle downgrade and health filtering
3. `Provider Adapters`
   - Google
   - Bing
   - Baidu
   - DuckDuckGo
   - Brave
   - Tavily
4. `Merge & Policy Layer`
   - deduplication
   - provider merge
   - domain/source-kind rule filtering
   - upgrade candidate generation
5. `Dispatch Layer`
   - emit asynchronous collection dispatch requests

## 7. Core Objects

### 7.1 SearchRequest

`SearchRequest` should include:

1. `projectId`
2. optional `opportunityId`
3. optional `workflowId`
4. optional `taskId`
5. `purpose`: `planning | evidence`
6. `query`
7. optional `geo`
8. optional `language`
9. optional explicit `providers`
10. `maxResults`
11. `pages`
12. `autoUpgrade`
13. optional `policyOverride`

### 7.2 SearchRun

`SearchRun` is the execution record for one search run.

It should include:

1. `id`
2. `projectId`
3. optional `opportunityId`
4. optional `workflowId`
5. optional `taskId`
6. `purpose`
7. `query`
8. `status`
9. `selectedProviders`
10. `degradedProviders`
11. `startedAt`
12. `finishedAt`

### 7.3 SearchResult

Each normalized search result should include:

1. `id`
2. `searchRunId`
3. `provider`
4. `title`
5. `url`
6. `snippet`
7. `rank`
8. `page`
9. `domain`
10. `sourceKindGuess`
11. `dedupKey`
12. `selectedForUpgrade`
13. `selectionReason`

### 7.4 UpgradeCandidate

Each upgrade candidate should include:

1. `searchResultId`
2. `searchRunId`
3. optional `opportunityId`
4. optional `workflowId`
5. `recommendedAction`: `http | browser | api | skip`
6. `reason`
7. `priority`
8. `requiresHumanReview`
9. `proposedSourceKind`
10. `proposedUseAs`

### 7.5 ProviderDiagnostic

Each provider diagnostic should include:

1. `providerId`
2. `status`
3. `degraded`
4. `reason`
5. `durationMs`
6. `resultCount`
7. optional `rateLimitState`

### 7.6 DowngradeInfo

Each downgrade record should include:

1. `providerId`
2. `status`
3. `reason`
4. `fallbackProviderId`
5. `phase`
6. `occurredAt`

### 7.7 ProviderCapability

Each provider capability record should include:

1. `providerId`
2. `enabledByDefault`
3. `requiresCredential`
4. `supportsGeo`
5. `supportsLanguage`
6. `supportsPagination`
7. `supportsMultiQuery`
8. `supportsAsync`
9. `supportsSnippet`
10. `supportsRichMetadata`
11. `defaultPriority`
12. `degradePriority`
13. `riskLevel`
14. `notes`

### 7.8 CredentialSchema

Each provider credential schema should include:

1. `providerId`
2. `requiredFields`
3. `optionalFields`
4. `validationRules`
5. `sensitiveFields`
6. `projectOverrideAllowed`

### 7.9 ProviderStatus

Each resolved provider status should include:

1. `providerId`
2. `enabled`
3. `healthy`
4. `credentialResolvedFrom`
5. `degraded`
6. optional `reason`

### 7.10 ValidationResult

Each configuration validation result should include:

1. `valid`
2. `errors`
3. `warnings`
4. `resolvedProviders`

### 7.11 UpgradeDispatchResult

Each upgrade dispatch result should include:

1. `searchRunId`
2. `dispatchedCount`
3. `skippedCount`
4. `collectorRequests`
5. `warnings`

## 8. Configuration Strategy

SearchGateway v1 should use three configuration classes:

### 8.1 Provider Catalog

One record per provider, including:

1. `providerId`
2. `displayName`
3. `category`
4. `enabledByDefault`
5. `requiresCredential`
6. `supportsGeo`
7. `supportsLanguage`
8. `supportsPagination`
9. `supportsMultiQuery`
10. `supportsAsync`
11. `supportsSnippet`
12. `supportsRichMetadata`
13. `supportsRateLimitHeader`
14. `defaultPriority`
15. `defaultTimeoutMs`
16. `degradePriority`
17. `riskLevel`
18. `notes`

### 8.2 Credential Schema

Credential definitions must be explicit, per provider.

This layer should define:

1. required fields
2. optional fields
3. validation rules
4. sensitive field markers
5. source precedence

Credential precedence should be:

`project override > system default > disabled`

### 8.3 Routing Policy

Routing policy should exist at:

1. global default level
2. project override level
3. task-level temporary override level

It must be able to express:

1. default provider order
2. providers for planning mode
3. providers for evidence mode
4. multi-provider aggregation rules
5. downgrade rules
6. domain allow/deny rules
7. upgrade candidate rules

### 8.4 Configuration Source Boundaries

The confirmed source layering is:

1. system default configuration
2. project-level override configuration
3. task-level temporary override

Secret handling must stay outside Git-tracked config.

This means:

1. provider capability and routing policy can live in repo-managed config
2. provider credentials must live in secret storage, environment, or another non-Git secret source
3. project-level override must be possible without redefining the entire provider catalog

## 9. Provider Set For v1

The first confirmed external provider set is:

1. Google
2. Bing
3. Baidu
4. DuckDuckGo
5. Brave
6. Tavily

The strategic position is:

1. support both external APIs and future self-hosted/open-source search backends
2. first run the external provider path to prove the gateway
3. add self-hosted/open-source providers later without changing the main gateway contract

## 10. Selection And Upgrade Rules

The confirmed rule strategy is:

1. auto-selection should prioritize domain and source-type rules, not raw rank first
2. global default rules must exist
3. task-level override must be allowed
4. automatic upgrade candidate selection must exist
5. human adjustment must be allowed before final collection dispatch

Recommended first-order rule logic:

1. official domains are preferred for upgrade
2. known low-trust domains can be filtered or forced into review
3. commercial and community results should usually require stronger review than official results
4. rank may be used as a secondary signal, not a primary truth signal

## 11. Return Shape

The recommended service return shape is:

`SearchRunResult = SearchRun + SearchResult[] + UpgradeCandidate[] + ProviderDiagnostic[] + DowngradeInfo[]`

This is preferred over a plain result list because:

1. planning and evidence runs must be auditable
2. provider degradation must be visible
3. upgrade candidates must be inspectable and adjustable
4. asynchronous collection dispatch must still be traceable to the original search run

## 12. Minimal Interfaces

### 12.1 Package-Level Interface

The core package should expose:

1. `search(request): Promise<SearchRunResult>`
2. `upgradeCandidates(searchRunId, selection): Promise<UpgradeDispatchResult>`
3. `getProviderStatus(projectId?): Promise<ProviderStatus[]>`
4. `validateSearchConfig(projectId?): ValidationResult`

### 12.2 Service-Level Interface

The service should expose:

1. `POST /api/v1/search/runs`
2. `GET /api/v1/search/runs/:id`
3. `POST /api/v1/search/runs/:id/upgrade`
4. `GET /api/v1/search/providers`
5. `POST /api/v1/search/config/validate`

## 13. Repository Placement

The recommended placement in the current repo is:

1. `packages/search-gateway/`
2. `services/search-gateway/`
3. `config/search/providers/`
4. `config/search/policies/`
5. `config/projects/<project>/search/`
6. `tests/contract/search-gateway-schema.test.ts`
7. `tests/integration/search-gateway.test.ts`
8. `tests/integration/search-gateway-policy.test.ts`
9. `tests/integration/search-gateway-degrade.test.ts`

This is preferred over embedding search directly into `control-api`, because:

1. `control-api` should consume search capability, not own all provider details
2. skills should not become the only gateway entrypoint
3. future workers and future admin UIs should be able to call the same service

The configuration split should be interpreted as:

1. `config/search/*` for system defaults
2. `config/projects/<project>/search/*` for project overrides
3. secret credentials resolved outside Git-tracked files

## 14. Testing Requirements

SearchGateway v1 must be shipped with at least four test groups:

### 14.1 Contract Tests

Validate:

1. `SearchRequest`
2. `SearchRun`
3. `SearchResult`
4. `UpgradeCandidate`
5. `ProviderDiagnostic`
6. `ProviderCapability`
7. `CredentialSchema`
8. `DowngradeInfo`

### 14.2 Provider Adapter Tests

Per provider, validate:

1. request mapping
2. response normalization
3. error normalization
4. missing credential behavior
5. timeout and rate-limit behavior

### 14.3 Merge & Policy Tests

Validate:

1. multi-provider deduplication
2. domain/source-type priority logic
3. global vs task-level override behavior
4. upgrade candidate generation
5. human override application

### 14.4 Integration Tests

Validate:

1. synchronous search return
2. asynchronous collection dispatch trigger
3. downgrade information visibility
4. search run traceability to later collection dispatch

The whole feature must ultimately pass fresh repository-level verification.

## 15. Non-Goals

SearchGateway v1 should not:

1. perform full collector work
2. replace `CollectorGateway`
3. directly create `EvidenceSet`
4. directly make delivery decisions
5. absorb all runtime concerns into one giant service
6. turn memory into truth source

## 16. Design Summary

The recommended SearchGateway design is:

1. layered, not monolithic
2. reusable by skills and non-skill callers
3. provider-driven, not hardcoded
4. policy-controlled, not rank-trusting
5. discovery-first, not evidence-faking
6. capable of asynchronous collection handoff
7. compatible with the current OpenFons truth chain

In short:

`SearchGateway` should become the discovery execution layer for OpenFons, while `CollectorGateway` remains the formal collection execution layer and `EvidenceSet` remains the formal evidence truth layer.

## 17. Self-Review

### Placeholder Scan

No placeholder markers such as `TODO`, `TBD`, or incomplete sections remain.

### Internal Consistency

The design keeps the main OpenFons truth chain unchanged and introduces `SearchRun / SearchResult / UpgradeCandidate` only as discovery execution objects. No section redefines them as final evidence or final truth artifacts.

### Scope Check

This document is intentionally scoped to `SearchGateway v1` only. It does not attempt to fully design `CollectorGateway`, the complete runtime harness, or long-term memory architecture in the same document.

### Ambiguity Check

The design explicitly fixes:

1. external provider set for v1
2. global default plus task-level override policy
3. synchronous search return plus asynchronous collection dispatch
4. domain/source-type-first upgrade rules
5. `SearchRun` as distinct from `TopicRun`
6. planning-mode search vs post-confirmation evidence-mode search
