# Docs Phase Restructure Implementation Plan

> **History note:** This plan intentionally preserves the pre-restructure `docs/plan1 -> docs/plan2/docs/sot/docs/references` move map as execution evidence. These old paths describe the migration source at that time, not the current official filing locations.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize planning documents so `docs/plan1` keeps Phase 1 execution material, `docs/plan2` holds Phase 2 architecture and case materials, `docs/sot` holds cross-phase source-of-truth docs, and raw input material is separated into references.

**Architecture:** Treat the docs tree as four layers: phase-specific execution, phase-specific product planning, cross-phase source of truth, and raw/reference inputs. Move files without changing their substantive content, then add lightweight index files and update any path wording that would become misleading after the move.

**Tech Stack:** Markdown, HTML, PowerShell file operations, Git working tree

---

### Task 1: Establish the target directory structure

**Files:**
- Create: `docs/plan1/README.md`
- Create: `docs/plan2/README.md`
- Create: `docs/sot/README.md`
- Create: `docs/references/README.md`
- Create: `docs/references/raw-inputs/README.md`

- [ ] **Step 1: Create the target directories**

Run:

```powershell
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\docs\plan2"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\docs\sot"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\docs\references"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\docs\references\raw-inputs"
```

Expected: all four directories exist after the command.

- [ ] **Step 2: Add index readmes**

Write short index files that explain:
- `docs/plan1` is Phase 1 execution and validation only.
- `docs/plan2` is Phase 2 architecture, opportunity, and case planning.
- `docs/sot` is cross-phase source-of-truth.
- `docs/references/raw-inputs` stores raw imported context, not formal plan docs.

- [ ] **Step 3: Verify the structure exists**

Run:

```powershell
Get-ChildItem "d:\demo1\openfons\docs" | Select-Object Name, Mode
```

Expected: `plan1`, `plan2`, `sot`, and `references` appear in the listing.

### Task 2: Move Phase 2 planning files

**Files:**
- Move: `docs/plan1/MiroFish与DeerFlow深度对比及对OpenFons的借鉴建议-2026-03-27.md` -> `docs/plan2/MiroFish与DeerFlow深度对比及对OpenFons的借鉴建议-2026-03-27.md`
- Move: `docs/plan1/openfons-best-practice-architecture-2026-03-27.html` -> `docs/plan2/openfons-best-practice-architecture-2026-03-27.html`
- Move: `docs/plan1/openfons-architecture-fusion-map-2026-03-27.html` -> `docs/plan2/openfons-architecture-fusion-map-2026-03-27.html`
- Move: `docs/plan1/北美利基内容采集、分析与内容变现路线.md` -> `docs/plan2/北美利基内容采集、分析与内容变现路线.md`
- Move: `docs/plan1/利基选题门禁与产品机会框架讨论.md` -> `docs/plan2/利基选题门禁与产品机会框架讨论.md`
- Move: `docs/plan1/利基选题标准表-v1.md` -> `docs/plan2/利基选题标准表-v1.md`
- Move: `docs/plan1/利基选题标准表-v1-案例评分.md` -> `docs/plan2/利基选题标准表-v1-案例评分.md`
- Move: `docs/plan1/利基选题标准表-v1-页面级优先级评分.md` -> `docs/plan2/利基选题标准表-v1-页面级优先级评分.md`
- Move: `docs/plan1/OpenClaw部署SEO选题与报告案例.md` -> `docs/plan2/OpenClaw部署SEO选题与报告案例.md`
- Move: `docs/plan1/AI编程与Agent时代模型采购、路由、成本与地区选择系统案例.md` -> `docs/plan2/AI编程与Agent时代模型采购、路由、成本与地区选择系统案例.md`
- Move: `docs/plan1/launch-briefs` -> `docs/plan2/launch-briefs`

- [ ] **Step 1: Move the approved Phase 2 files**

Use `Move-Item` for each file and move the entire `launch-briefs` directory in one operation.

- [ ] **Step 2: Update path wording inside moved Markdown docs**

Change stale wording such as ``文档定位：`docs/plan1` `` to reflect `docs/plan2`, and keep the meaning aligned with the new directory layout.

- [ ] **Step 3: Verify the Phase 2 directory contents**

Run:

```powershell
Get-ChildItem "d:\demo1\openfons\docs\plan2" -Recurse | Select-Object FullName
```

Expected: all moved planning files appear under `docs/plan2`.

### Task 3: Move cross-phase source-of-truth and raw inputs

**Files:**
- Move: `docs/plan1/开放源平台技术团队说明.md` -> `docs/sot/开放源平台技术团队说明.md`
- Move: `docs/plan1/开放源平台投资人说明.md` -> `docs/sot/开放源平台投资人说明.md`
- Move: `docs/plan1/doubao_20260326183156_深度阅读我上传的文档_重新输出一版权威的面向内部团队的计划书.txt` -> `docs/references/raw-inputs/doubao_20260326183156_深度阅读我上传的文档_重新输出一版权威的面向内部团队的计划书.txt`

- [ ] **Step 1: Move source-of-truth docs into `docs/sot`**

Use `Move-Item` to move the two cross-phase docs.

- [ ] **Step 2: Move raw imported context into `docs/references/raw-inputs`**

Use `Move-Item` so the raw text is preserved but no longer mixed into active plan docs.

- [ ] **Step 3: Verify the new locations**

Run:

```powershell
Get-ChildItem "d:\demo1\openfons\docs\sot"
Get-ChildItem "d:\demo1\openfons\docs\references\raw-inputs"
```

Expected: the two SoT docs and the raw imported text are present.

### Task 4: Final verification and memory update

**Files:**
- Modify: `Memory/03_chat_logs/<new timestamp>.md`

- [ ] **Step 1: Check the remaining contents of `docs/plan1`**

Run:

```powershell
Get-ChildItem "d:\demo1\openfons\docs\plan1" | Select-Object Name, Mode
```

Expected: Phase 1 material remains, plus the new README if created.

- [ ] **Step 2: Capture the directory diff**

Run:

```powershell
git -C "d:\demo1\openfons" status --short -- docs Memory
```

Expected: moved files show as renames or delete/add pairs under the new directories.

- [ ] **Step 3: Append a Memory chat log**

Add one new chat log summarizing the approved Scheme C restructure, the directories created, and the file groups moved.
