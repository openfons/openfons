# OpenFons Deep Planning And Decoupled Pipeline Design

> Date: 2026-03-29
> Status: Draft for review
> Scope: v1 architecture wording, SoT synchronization, and the first AI procurement case

## 1. Why This Design Exists

OpenFons has already proven a limited shell:

`OpportunityInput -> OpportunitySpec -> TaskSpec / WorkflowSpec -> ReportSpec -> report-web artifact shell`

What it has not yet proven is the truth chain behind the shell:

`TopicRun / SourceCapture / CollectionLog / Evidence / EvidenceSet / final Artifact`

The current design gap is not only "missing evidence objects". It is also that the front half of the system is still easy to misread as:

`user asks -> AI lightly searches -> system picks a direction -> later stages justify that direction`

That reading is wrong for the product we now want to build.

The corrected product stance is:

1. The planning stage must be a deep AI research stage, not a light search convenience layer.
2. The output of planning is not an early conclusion. It is an auditable planning result that must compile into `OpportunitySpec` and, after `User Confirmation`, into an executable task boundary.
3. Later collection and analysis must search for the best current answer, not defend the earlier planning choice.
4. Delivery form is downstream of findings. It may be a report page, a tracker, a compare page, or an AI tool opportunity.

## 2. The Main Decision

The recommended end-to-end pipeline for OpenFons v1 becomes:

`User Input -> Planning Compiler -> Confirmed Task Boundary -> Collection Runtime -> Evidence/Finding Runtime -> Delivery Compiler -> Artifact`

Expanded wording:

`User Input -> AI Deep Planning Research / Multi-Agent Planning -> OpportunitySpec -> User Confirmation -> compile confirmed task boundary -> real collection -> evidence qualification -> finding derivation -> delivery decision -> final artifact`

This is a pipeline decision, not a deployment decision. It defines decoupled capability boundaries first. Physical microservice splitting can happen later.

It should be read as a capability-block interpretation of the existing main chain, not as a replacement of the current contract truth source:

1. `Planning Compiler` maps to `Intent Structuring -> Planning Swarm -> Opportunity Judge -> OpportunitySpec`
2. `Confirmed Task Boundary` maps to `User Confirmation -> Task Compiler -> TaskSpec / WorkflowSpec`
3. `Delivery Compiler` must still resolve into the current outward delivery contract, which is `ReportSpec` in v1, and it must be generated from `Evidence / EvidenceSet` plus findings unless a later ADR introduces another formal delivery contract

## 3. Correct Interpretation Of Each Stage

### 3.1 Planning Compiler

This stage includes:

`User Input -> AI Deep Planning Research / Multi-Agent Planning -> OpportunitySpec -> User Confirmation -> compile confirmed task boundary`

Its job is to:

1. understand what the user is actually asking
2. run deep planning research against the open web and other allowed inputs
3. identify candidate cohorts, comparison frames, unknowns, and disconfirming questions
4. freeze a reviewable planning result and compile a confirmed task boundary

It must not:

1. pretend to know the final answer before collection
2. treat early research results as final evidence by default
3. optimize for defending an early page angle

The durable outputs of this stage are an auditable `OpportunitySpec` and a confirmed task boundary that downstream runtimes can consume without inheriting hidden conversational state.

The deep planning research performed here must also be auditable. It should not survive only inside model context. Planning-stage search and discovery work must be recorded as auditable captures. In the current SoT, those captures should preferably already land as planning-stage `SourceCapture / CollectionLog`-compatible records, or at minimum as logged artifacts that can deterministically map into those objects later, so downstream stages can reuse the captured material without inheriting hidden reasoning state.

### 3.2 Collection Runtime

This stage consumes the confirmed task boundary and performs real capture work.

Its job is to:

1. execute source access and capture attempts
2. persist `SourceCapture` records
3. persist `CollectionLog` records
4. keep success, failure, timing, and raw-source traceability

This stage is decoupled from both planning and delivery. It should be replaceable without changing the planning contract.

### 3.3 Evidence/Finding Runtime

This stage consumes collected material and produces reviewed evidence plus current findings.

Its job is to:

1. qualify which captured content is reliable enough to use
2. label official, community, commercial, and inference-derived material clearly
3. derive the best current answer from collected data
4. preserve known unknowns and invalidated hypotheses

This stage must not:

1. bend findings to match planning-stage preferences
2. collapse "captured" into "claim-ready"
3. collapse "evidence-qualified" into "final delivery decision"

### 3.4 Delivery Compiler

This stage consumes findings and decides what the right outward artifact should be.

Possible outputs include:

1. a report page
2. a continuously updated tracker
3. a comparison surface
4. a tool opportunity recommendation
5. another delivery type introduced later

For v1, `report-web` remains the default first delivery target, but it is no longer treated as the universal shape of every future output.

## 4. Decoupling Principle

OpenFons should be designed as a decoupled compilation pipeline.

The important thing to freeze now is interface decoupling, not premature infrastructure splitting.

### 4.1 Decoupled capability blocks

The system should be separable into four capability blocks:

1. `Planning Compiler`
2. `Collection Runtime`
3. `Evidence/Finding Runtime`
4. `Delivery Compiler`

### 4.2 Decoupling rule

Each block must:

1. have explicit input/output objects
2. avoid hidden dependence on thread-local conversational memory
3. be replaceable without rewriting the whole chain
4. be testable in isolation

### 4.3 Deployment rule

These blocks may start in one repo, one process, or one database.

They do not need to start as separate network microservices.

What must be microservice-like from day one is the contract boundary, not the hosting topology.

## 5. Truth Rules

### 5.1 Planning outputs are reusable inputs, not reusable conclusions

Front-half deep research results can be reused later, but only as:

1. planning context
2. task constraints
3. source-discovery hints
4. disconfirming questions

They are not automatically final evidence.

### 5.2 Collection and analysis are discovery-first

The later stages must answer:

1. what did we actually find
2. what current answer is best supported
3. what remains unknown
4. what delivery form is justified by those findings

They must not answer:

1. how do we prove our first planning choice was right

## 6. Object Boundary Recommendation

To support decoupling without overfreezing business fields, OpenFons should prefer stable shells plus family-specific payloads.

Recommended capability-level object roles:

1. planning-stage understanding of the task
   In the current SoT this should normally live inside `OpportunitySpec` and its internal fields, not as a new parallel external contract.
2. executable collection-ready task
   In the current SoT this should normally resolve into `TaskSpec / WorkflowSpec`, not a newly introduced top-level object name.
3. reviewed evidence and findings
   This continues to map to `Evidence / EvidenceSet`.
4. chosen outward delivery form
   In v1 this continues to map to `ReportSpec`, while keeping room for future delivery contracts only through a later ADR.

This design intentionally separates:

1. stable pipeline role
2. dynamic task-family payload

So the system can support both:

1. `ai-procurement`
2. future cases like account monitoring, competitor tracking, or alert workflows

without rewriting the pipeline every time.

This section is intentionally not proposing three new formal cross-team contracts. It is naming stable pipeline roles while staying compatible with the current SoT contract set.

## 7. AI Procurement As The First Case

The first case is frozen to the confirmed raw user question:

`现在是 AI 编程、agent 时代，tokens 消耗巨大，用户需要一个既聪明、还便宜的模型供应商。到底应该买哪一家，还是多家一起买，还是通过中转？能不能调研全球大模型价格对比，也比较一些知名第三方中转，并考虑多语言和不同国家的结构？`

For this case, planning must:

1. identify what decision the user is really trying to make
2. define comparison scope and candidate cohorts
3. define normalization fields
4. define disconfirming questions
5. compile a real collection-ready confirmed task boundary

It must not pre-commit the final answer or final delivery shape before collection and findings.

## 8. SoT Synchronization Targets

The following files must be synchronized to the new interpretation:

1. `docs/sot/开放源平台技术团队说明.md`
2. `docs/sot/开放源平台当前正式架构说明.md`
3. `docs/sot/开放源平台投资人说明.md`
4. `docs/workbench/openfons-best-practice-architecture-2026-03-27.html`
5. `docs/workbench/openfons-architecture-fusion-map-2026-03-27.html`

### 8.1 Required wording changes

These files should be updated to make the following explicit:

1. planning is deep research, not light search
2. planning compiles executable task boundaries, not final answers
3. planning-stage research must leave auditable discovery captures, not hidden model-only context
4. collection and analysis are not there to justify planning
5. delivery is chosen from findings, not assumed in advance
6. the architecture is decoupled by contract boundary

### 8.2 Specific wording pressure points

The current wording that needs tightening includes:

1. any expression that sounds like `lightweight validation`
2. any flow that makes `planning -> evidence -> report` look linear but conclusion-preserving
3. any diagram that treats `ReportSpec` as the only long-term delivery shape
4. any architecture note that describes the system as if its stages are tightly bound implementation units instead of replaceable pipeline blocks

## 9. What Should Happen Next

After this design is approved:

1. synchronize the SoT and architecture HTML files named above
2. compile the first `AI procurement` case into the current contract-compatible forms:
   - an `OpportunitySpec`-compatible planning result
   - `TaskSpec / WorkflowSpec`-compatible confirmed execution boundary
   - `disconfirming questions`
   - first collection scope
3. begin the real collection chain while reusing auditable planning captures instead of hidden planning context

## 10. Risks

If OpenFons does not make this shift, the likely failure modes are:

1. planning-stage guesswork ossifies into fake certainty
2. evidence work becomes backfilled justification
3. report-web keeps looking more mature than the truth chain behind it
4. future non-report tasks will either distort `ReportSpec` or bypass the main architecture

## 11. Self-Review

This design intentionally chooses:

1. decoupled pipeline boundaries over premature microservice deployment
2. deep planning research over light pre-search
3. discovery of the best current answer over defense of early assumptions
4. delivery flexibility over report-only thinking

No placeholder sections, open TODO markers, or contradictory main-chain definitions remain in this draft.
