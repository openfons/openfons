# OpenClaw + AI Procurement Dual Experiment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run two controlled case experiments that prove whether OpenFons can take a natural-language topic seed and reliably produce reviewable `OpportunitySpec -> Evidence Index -> EvidenceSet -> TaskSpec -> WorkflowSpec -> ReportSpec` artifacts before we invest in a runnable TypeScript demo of the future runtime chain.

**Architecture:** Treat the two existing `docs/plan2` case documents as experiment seeds, not final deliverables. Run `AI procurement` as the likely beachhead candidate and `OpenClaw` as the showcase/control case through the same manual validation workflow, store the artifacts under `docs/plan2/experiments/`, then write one cross-case findings document that explicitly separates the current manual validation chain from the future TypeScript runtime contract.

**Tech Stack:** Markdown, PowerShell, existing `docs/plan2` case docs, structured JSON-in-Markdown outputs, manual source verification

---

## Scope And Success Criteria

This umbrella plan intentionally manages two parallel experiment tracks because they validate the same upstream planning pipeline:

1. `OpenClaw` validates topic selection, SEO page-angle narrowing, and deployment-theme evidence assembly.
2. `AI procurement` validates pricing-source weighting, cost-normalization logic, and comparison-style report generation.

The experiment is successful only if all of the following become true:

1. Each track produces one portfolio-level runthrough document.
2. Each track produces one evidence index with source categories and timestamps.
3. Each track produces one explicit `EvidenceSet` derived from the evidence index.
4. Each track narrows to one selected single-page direction based on documented scoring and source-backed reasoning, not pre-fixed choice.
5. Each selected direction has a concrete `OpportunitySpec`, `TaskSpec`, `WorkflowSpec`, and `ReportSpec`.
6. A cross-case findings document names what is reusable, what is still manual, and whether a minimal TypeScript demo should start next.

## Case Roles And Scoring Hygiene

1. This plan does not reopen company GTM from scratch. `AI procurement` is the beachhead-candidate track; `OpenClaw` is the showcase/control track.
2. The older five-dimension tables inside source case docs are legacy exploratory context, not the active execution contract for this experiment.
3. Before any direction can be ranked, it must pass four hard gates: `Authority`, `Distribution`, `Compliance`, and `Maintenance Cost`.
4. Any direction that fails a hard gate is marked `blocked` or `lab-only` and cannot win regardless of any secondary score.
5. Only hard-gate survivors may be compared on `Demand / Evidence / Difficulty / Business / Updateability`, and those five fields act only as secondary ranking dimensions.
6. Each selected direction must bind at least one repo-local collector artifact or normalized capture example to the evidence model so this experiment pressure-tests real material instead of hand-written notes only.
7. Cross-case findings must output both a `manual validation chain` and a `future runtime chain`; only the future runtime chain may be recommended for TypeScript implementation.

### Task 1: Establish the experiment workspace and artifact contract

**Files:**
- Create: `docs/plan2/experiments/README.md`
- Create: `docs/plan2/experiments/2026-03-28-openclaw-runthrough.md`
- Create: `docs/plan2/experiments/2026-03-28-openclaw-evidence-index.md`
- Create: `docs/plan2/experiments/2026-03-28-openclaw-evidence-set.md`
- Create: `docs/plan2/experiments/2026-03-28-ai-procurement-runthrough.md`
- Create: `docs/plan2/experiments/2026-03-28-ai-procurement-evidence-index.md`
- Create: `docs/plan2/experiments/2026-03-28-ai-procurement-evidence-set.md`
- Create: `docs/plan2/experiments/2026-03-28-cross-case-findings.md`

- [ ] **Step 1: Create the experiment directory and empty artifact files**

Run:

```powershell
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\docs\plan2\experiments"
New-Item -ItemType File -Force -Path "d:\demo1\openfons\docs\plan2\experiments\README.md"
New-Item -ItemType File -Force -Path "d:\demo1\openfons\docs\plan2\experiments\2026-03-28-openclaw-runthrough.md"
New-Item -ItemType File -Force -Path "d:\demo1\openfons\docs\plan2\experiments\2026-03-28-openclaw-evidence-index.md"
New-Item -ItemType File -Force -Path "d:\demo1\openfons\docs\plan2\experiments\2026-03-28-openclaw-evidence-set.md"
New-Item -ItemType File -Force -Path "d:\demo1\openfons\docs\plan2\experiments\2026-03-28-ai-procurement-runthrough.md"
New-Item -ItemType File -Force -Path "d:\demo1\openfons\docs\plan2\experiments\2026-03-28-ai-procurement-evidence-index.md"
New-Item -ItemType File -Force -Path "d:\demo1\openfons\docs\plan2\experiments\2026-03-28-ai-procurement-evidence-set.md"
New-Item -ItemType File -Force -Path "d:\demo1\openfons\docs\plan2\experiments\2026-03-28-cross-case-findings.md"
```

Expected: the `experiments` directory exists and contains exactly eight first-batch files.

- [ ] **Step 2: Write the workspace contract into `docs/plan2/experiments/README.md`**

The README must state these rules explicitly:

1. `runthrough` files record the full planning chain from seed question to selected page direction.
2. `evidence-index` files list sources by category: `official`, `community`, `commercial`, `discovery-only`.
3. `evidence-set` files transform the index into citation-ready, claim-ready evidence objects for one selected page direction.
4. Every factual source entry must include an access date and a short reason for inclusion.
5. Portfolio-level thinking and single-page thinking must both appear in the same experiment track.
6. No production code is written in this phase; the output is decision-ready documentation only.
7. Scoring uses hard gates first, then secondary ranking dimensions.
8. Each selected direction must point back to at least one repo-local artifact bundle or normalized capture example.
9. Cross-case findings must distinguish the current manual validation workflow from the future runtime chain.

- [ ] **Step 3: Verify the workspace exists**

Run:

```powershell
Get-ChildItem "d:\demo1\openfons\docs\plan2\experiments" | Select-Object Name
```

Expected: the listing shows the eight files named in this task.

### Task 2: Run the OpenClaw case from portfolio hypothesis to one selected page

**Files:**
- Read: `docs/plan2/OpenClaw部署SEO选题与报告案例.md`
- Modify: `docs/plan2/experiments/2026-03-28-openclaw-runthrough.md`
- Modify: `docs/plan2/experiments/2026-03-28-openclaw-evidence-index.md`
- Modify: `docs/plan2/experiments/2026-03-28-openclaw-evidence-set.md`

- [ ] **Step 1: Freeze the experiment input and initial assumptions**

Write the top section of `2026-03-28-openclaw-runthrough.md` with:

1. the original user seed
2. the case-doc goal
3. the assumed market/language status as `pending_validation`
4. the initial 10 directions as `planning_hypothesis`

Expected: the runthrough document begins with a stable input block instead of free-form notes.

- [ ] **Step 2: Build the OpenClaw evidence index**

Record at least these source buckets in `2026-03-28-openclaw-evidence-index.md`:

1. official install docs
2. official repo or issue references
3. community troubleshooting discussions
4. hosting or VPS commercial pages
5. Google/Search Console methodology references already cited by the case doc

Also add one `Artifact Binding` subsection that points to at least one repo-local OpenClaw-related artifact bundle from the existing collector outputs, such as:

1. `labs/collector-compat/results/artifacts/2026-03-25_openclaw_hosting`
2. `labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored`

For each artifact binding entry include:

```text
- artifact_bundle:
- artifact_path:
- why_relevant:
- normalization_hint:
```

Each entry must include:

```text
- source_type:
- title:
- url:
- accessed_on: 2026-03-28
- use_as: primary / corroboration / discovery-only
- note:
```

- [ ] **Step 3: Score the 10 directions and choose the first execution angle**

Do not start with the legacy five-dimension table alone. First apply these hard gates to all 10 directions:

1. `Authority`
2. `Distribution`
3. `Compliance`
4. `Maintenance Cost`

Record each direction as `pass / blocked / lab-only` with a one-line reason.

Then score only the hard-gate survivors using these secondary dimensions:

1. `Demand`
2. `Evidence`
3. `Difficulty`
4. `Business`
5. `Updateability`

After the hard-gate table and secondary scoring table are written, choose exactly one first execution angle based on the highest defensible score and source-backed reasoning.

The runthrough must explicitly record:

1. the winning direction
2. the runner-up direction
3. why the winning direction was chosen
4. why the runner-up was not chosen yet
5. whether the choice should be revisited after deeper evidence collection
6. which directions were blocked by hard gates and why

The plan must not pre-commit the winner before the scoring and evidence notes exist.

- [ ] **Step 4: Build the OpenClaw `EvidenceSet` for the selected direction**

Write `2026-03-28-openclaw-evidence-set.md` as a structured synthesis of only the evidence needed for the selected page.

Each evidence item must include:

```text
- claim_id:
- claim:
- artifact_refs:
- supporting_sources:
- source_weight:
- freshness_note:
- caveat:
```

Expected: the `EvidenceSet` is narrower than the evidence index and only contains claim-ready evidence for the chosen page.

- [ ] **Step 5: Compile the selected direction into structured outputs**

Append these four sections to `2026-03-28-openclaw-runthrough.md`:

1. `OpportunitySpec`
2. `TaskSpec`
3. `WorkflowSpec`
4. `ReportSpec`

The selected page must stay single-page scoped and must not drift back into the 10-page portfolio.

- [ ] **Step 6: Close the OpenClaw track with an experiment verdict**

Write a final section named `Experiment Verdict` that answers:

1. Which parts of the chain felt stable?
2. Which parts still required heavy manual judgment?
3. What evidence was easy to obtain?
4. What evidence remains weak?
5. Whether the selected page stayed within the intended showcase/control role
6. Whether this track is strong enough to feed a later demo

Expected: one finished runthrough file, one finished evidence index, and one finished `EvidenceSet` exist for the OpenClaw case.

### Task 3: Run the AI procurement case from portfolio hypothesis to one selected page

**Files:**
- Read: `docs/plan2/AI编程与Agent时代模型采购、路由、成本与地区选择系统案例.md`
- Modify: `docs/plan2/experiments/2026-03-28-ai-procurement-runthrough.md`
- Modify: `docs/plan2/experiments/2026-03-28-ai-procurement-evidence-index.md`
- Modify: `docs/plan2/experiments/2026-03-28-ai-procurement-evidence-set.md`

- [ ] **Step 1: Freeze the experiment input and initial assumptions**

Write the top section of `2026-03-28-ai-procurement-runthrough.md` with:

1. the original user seed
2. the case-doc goal
3. audience, geography, and language all marked `pending_validation`
4. the initial 10 directions marked `planning_hypothesis`

- [ ] **Step 2: Build the procurement evidence index from source tiers**

Record at least these source buckets in `2026-03-28-ai-procurement-evidence-index.md`:

1. official provider pricing pages
2. official provider region or availability pages
3. official routing-platform pricing pages
4. official docs about caching, tool calls, rate limits, or billing notes
5. community corroboration
6. affiliate or media comparison pages marked `discovery-only`

Each entry must include an access date and one short note about what comparison field it supports.

Also add one `Artifact Binding` subsection that points to at least one repo-local collector-backed capture, HTML snapshot, screenshot, or normalized source note. If no suitable procurement bundle exists yet, the track is blocked until a minimal capture example is created and linked.

Freeze the minimum acceptable capture example shape before using it as evidence. Each minimum capture example must include:

```text
- capture_id:
- source_url:
- captured_on:
- repo_local_artifact_path:
- artifact_type: html_snapshot / screenshot / text_capture / normalized_note
- normalization_note:
- comparison_fields_supported:
```

- [ ] **Step 3: Choose the first execution angle and normalize the comparison frame**

This is the beachhead-candidate validation track. It does not reopen GTM from scratch; it pressure-tests whether procurement remains the strongest near-term entry point after hard-gate review.

Do not start with secondary scoring alone. First apply these hard gates to all candidate directions:

1. `Authority`
2. `Distribution`
3. `Compliance`
4. `Maintenance Cost`

Record each direction as `pass / blocked / lab-only` with a one-line reason.

Then score only the hard-gate survivors using these frozen secondary dimensions:

1. `Demand`
2. `Evidence`
3. `Difficulty`
4. `Business`
5. `Updateability`

After the hard-gate table and secondary scoring table are written, choose exactly one first execution angle based on the highest defensible score and source-backed reasoning.

If the chosen direction is any provider-comparison page, the runthrough must first freeze the comparison cohort before any claim writing starts.

The cohort-freeze section must record:

1. the chosen page direction
2. the exact providers or platforms included
3. why those entries are in-scope
4. which obvious candidates were excluded
5. the rule for future cohort expansion
6. which candidate directions were blocked by hard gates and why

Also write a fixed normalization frame that every comparison claim must use:

1. `base_input_price`
2. `base_output_price`
3. `cached_input_price`
4. `tool_call_or_extra_cost`
5. `region_availability`
6. `billing_notes`
7. `source_timestamp`

- [ ] **Step 4: Build the procurement `EvidenceSet` for the selected direction**

Write `2026-03-28-ai-procurement-evidence-set.md` as a structured synthesis of only the evidence needed for the selected page.

Each evidence item must include:

```text
- claim_id:
- claim:
- artifact_refs:
- normalized_fields:
- supporting_sources:
- source_weight:
- freshness_note:
- caveat:
```

Expected: the `EvidenceSet` is narrower than the evidence index and already maps evidence into the fixed cost-normalization frame when relevant.

- [ ] **Step 5: Compile the selected direction into structured outputs**

Append these four sections to `2026-03-28-ai-procurement-runthrough.md`:

1. `OpportunitySpec`
2. `TaskSpec`
3. `WorkflowSpec`
4. `ReportSpec`

The page thesis must answer a real procurement decision and must not collapse back into a generic global price table.

- [ ] **Step 6: Close the procurement track with an experiment verdict**

Write a final section named `Experiment Verdict` that answers:

1. whether source weighting stayed clear
2. whether normalization fields were sufficient
3. where manual editorial judgment still dominated
4. whether the selected page still fits the beachhead-candidate role
5. whether the comparison page is strong enough to serve as a future demo seed

Expected: one finished runthrough file, one finished evidence index, and one finished `EvidenceSet` exist for the AI procurement case.

### Task 4: Write the cross-case findings and reusable pipeline summary

**Files:**
- Read: `docs/plan2/experiments/2026-03-28-openclaw-runthrough.md`
- Read: `docs/plan2/experiments/2026-03-28-ai-procurement-runthrough.md`
- Read: `docs/plan2/experiments/2026-03-28-openclaw-evidence-index.md`
- Read: `docs/plan2/experiments/2026-03-28-ai-procurement-evidence-index.md`
- Read: `docs/plan2/experiments/2026-03-28-openclaw-evidence-set.md`
- Read: `docs/plan2/experiments/2026-03-28-ai-procurement-evidence-set.md`
- Modify: `docs/plan2/experiments/2026-03-28-cross-case-findings.md`

- [ ] **Step 1: Compare the two tracks against the same pipeline**

Use the exact comparison row set below:

1. `seed clarity`
2. `role fit`
3. `hard-gate decisiveness`
4. `opportunity narrowing`
5. `evidence availability`
6. `source-weighting difficulty`
7. `evidence-set completeness`
8. `artifact binding quality`
9. `single-page thesis clarity`
10. `report-structure readiness`
11. `human-review burden`

- [ ] **Step 2: Separate the manual validation chain from the future runtime chain**

Write one section that freezes the current manual validation chain as:

`Seed -> Intent Notes -> Hard Gates -> Evidence Index -> EvidenceSet -> OpportunitySpec -> TaskSpec -> WorkflowSpec -> ReportSpec -> Human Review -> Cross-Case Findings`

Then write one section that freezes the future runtime chain candidate as:

`OpportunitySpec -> TaskSpec -> WorkflowSpec -> EvidenceSet -> ReportSpec -> report-web`

Then state which nodes are already reusable, which are still manual, and which should stay out of the first TypeScript demo.

- [ ] **Step 3: Make the demo go/no-go recommendation**

The findings document must end with one of these outcomes for the future runtime chain:

1. `Go`: both experiments are strong enough to justify a minimal TypeScript demo
2. `Conditional Go`: a demo should start only after one named missing piece is tightened
3. `No-Go`: more manual experiments are needed first

The document must also include the exact reason for that outcome.

### Task 5: Prepare the handoff for the next planning cycle

**Files:**
- Modify: `docs/superpowers/plans/2026-03-28-openclaw-ai-procurement-dual-experiment-todo.md`

- [ ] **Step 1: Mark completed checkboxes in the execution TODO**

As each experiment artifact is produced, update the separate TODO document in the same commit so the plan and execution state do not drift apart.

- [ ] **Step 2: Record the exact next planning trigger**

At the bottom of the TODO document, add a one-line handoff rule:

`Only start the minimal TypeScript demo plan after the cross-case findings document reaches Go or Conditional Go for the future runtime chain.`

- [ ] **Step 3: Verify the artifact set is complete**

Run:

```powershell
Get-ChildItem "d:\demo1\openfons\docs\plan2\experiments" | Select-Object Name
```

Expected: README, two runthrough files, two evidence-index files, two `EvidenceSet` files, and one cross-case findings file all exist before the next planning cycle starts.
