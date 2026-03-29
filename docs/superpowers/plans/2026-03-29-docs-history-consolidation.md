# Docs History Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate `docs/context`, `docs/plan`, `docs/plan1`, and `docs/references` under a single `docs/history` layer while preserving auditability and updating current documentation governance.

**Architecture:** Treat `docs/history` as the unified historical layer with four preserved subtrees: `context`, `plan`, `plan1`, and `references`. Move the directories physically, then update the current docs entrypoints and SoT references so `docs/sot` and `docs/workbench` remain the only active top-level reading targets.

**Tech Stack:** Markdown, PowerShell file operations, Git working tree

---

### Task 1: Establish the new history layer

**Files:**
- Create: `docs/history/README.md`
- Move: `docs/context` -> `docs/history/context`
- Move: `docs/plan` -> `docs/history/plan`
- Move: `docs/plan1` -> `docs/history/plan1`
- Move: `docs/references` -> `docs/history/references`

- [ ] **Step 1: Create the target history directory**

Run:

```powershell
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\docs\history"
```

Expected: `docs/history` exists.

- [ ] **Step 2: Move the four legacy directories under `docs/history`**

Run:

```powershell
Move-Item -LiteralPath "d:\demo1\openfons\docs\context" -Destination "d:\demo1\openfons\docs\history\context"
Move-Item -LiteralPath "d:\demo1\openfons\docs\plan" -Destination "d:\demo1\openfons\docs\history\plan"
Move-Item -LiteralPath "d:\demo1\openfons\docs\plan1" -Destination "d:\demo1\openfons\docs\history\plan1"
Move-Item -LiteralPath "d:\demo1\openfons\docs\references" -Destination "d:\demo1\openfons\docs\history\references"
```

Expected: the four directories no longer exist at the `docs/` top level and now exist under `docs/history/`.

- [ ] **Step 3: Add a history-layer README**

Write a short index explaining:
- `docs/history` is the unified historical/background layer.
- `context`, `plan`, `plan1`, and `references` are preserved as subtypes of historical material.
- Active top-level reading should prefer `docs/sot`, `docs/workbench`, and `docs/superpowers`.

### Task 2: Update the docs entrypoints

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/workbench/README.md`
- Modify: `docs/superpowers/README.md`

- [ ] **Step 1: Rewrite the top-level docs index**

Update `docs/README.md` so the top-level structure becomes:
- `docs/sot`
- `docs/workbench`
- `docs/history`
- `docs/superpowers`

Expected: no top-level guidance still treats `plan1` or `references` as active standalone layers.

- [ ] **Step 2: Keep workbench governance aligned**

Update `docs/workbench/README.md` so it only defers to `docs/sot/**` for conflict resolution and points historical lookups to `docs/history/**` instead of separate old top-level folders.

- [ ] **Step 3: Update superpowers guidance**

Update `docs/superpowers/README.md` to describe the new official top-level layout and explain that old planning, phase-validation, raw inputs, and context are now grouped under `docs/history`.

### Task 3: Repair SoT and historical references after the move

**Files:**
- Modify: `docs/sot/README.md`
- Modify: `docs/sot/开放源平台当前正式架构说明.md`
- Modify: `docs/sot/开放源平台技术团队说明.md`
- Modify: `docs/sot/开放源平台投资人说明.md`
- Modify: files under `docs/history/**` that still use stale self-links where needed
- Modify: `README.md`

- [ ] **Step 1: Update SoT references to historical material**

Change references such as `../plan/...` and `./plan/...` to `../history/plan/...` or `./history/plan/...` as appropriate.

- [ ] **Step 2: Update root README references**

Change any root-level references to `docs/plan/` so they point at `docs/history/plan/`.

- [ ] **Step 3: Repair critical moved self-links**

Fix moved documents under `docs/history/**` when they contain path references that would break after relocation and are still useful for navigation or audit.

### Task 4: Verify the consolidation

**Files:**
- Modify: `Memory/03_chat_logs/<new timestamp>.md`

- [ ] **Step 1: Verify top-level docs structure**

Run:

```powershell
Get-ChildItem "d:\demo1\openfons\docs" | Select-Object Name, Mode
```

Expected: `sot`, `workbench`, `history`, and `superpowers` appear as the meaningful top-level documentation layers.

- [ ] **Step 2: Verify stale path references are gone**

Run:

```powershell
rg -n "docs/context|docs/plan1|docs/references|docs/plan/|../plan/|./plan/" "d:\demo1\openfons\docs" "d:\demo1\openfons\README.md"
```

Expected: only intentional historical text remains, or no matches remain.

- [ ] **Step 3: Append a Memory chat log**

Add one new chat log summarizing the approved consolidation into `docs/history`, the directories moved, and the current four-layer top-level docs structure.
