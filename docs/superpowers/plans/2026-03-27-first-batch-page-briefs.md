# First Batch Page Briefs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create page-level launch brief and ReportSpec docs for the 6 first-batch pages across the OpenClaw and AI procurement themes.

**Architecture:** Use one folder under `docs/plan2/launch-briefs/` and create one Markdown file per page so each page has a focused launch brief, clear query ownership, evidence requirements, and a reusable ReportSpec JSON block. Keep the structure consistent across all 6 files so they can later feed content production, Next.js rendering, or worker handoff.

**Tech Stack:** Markdown documentation, existing `docs/plan2` case docs, Git

---

### Task 1: Create launch brief folder and file set

**Files:**
- Create: `docs/plan2/launch-briefs/openclaw-deployment-options.md`
- Create: `docs/plan2/launch-briefs/openclaw-best-for-beginners.md`
- Create: `docs/plan2/launch-briefs/openclaw-windows-wsl2.md`
- Create: `docs/plan2/launch-briefs/ai-procurement-options.md`
- Create: `docs/plan2/launch-briefs/ai-cheap-coding-models.md`
- Create: `docs/plan2/launch-briefs/direct-api-vs-openrouter.md`

- [ ] **Step 1: Create the directory**

Run:

```bash
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\docs\plan2\launch-briefs"
```

Expected: directory exists

- [ ] **Step 2: Use one consistent template for all 6 files**

Each file should include these sections:

```md
# [Page Title]

> 主题：
> 批次：
> 页面角色：
> 优先级：

## 1. 页面定位
## 2. 目标用户与市场
## 3. Query Ownership
## 4. 核心 Thesis
## 5. 必须证明的关键判断
## 6. 证据要求
## 7. 页面结构建议
## 8. 商业化路径
## 9. 更新触发器
## 10. Launch Brief
## 11. ReportSpec
```

### Task 2: Write the 3 OpenClaw page briefs

**Files:**
- Create: `docs/plan2/launch-briefs/openclaw-deployment-options.md`
- Create: `docs/plan2/launch-briefs/openclaw-best-for-beginners.md`
- Create: `docs/plan2/launch-briefs/openclaw-windows-wsl2.md`

- [ ] **Step 1: Write `openclaw-deployment-options.md`**

Must capture:

```md
- pillar / 总入口页
- primary keyword: OpenClaw deployment options
- thesis: compare local, Docker, VPS, and managed paths by user type
- role: first-batch pillar page
```

- [ ] **Step 2: Write `openclaw-best-for-beginners.md`**

Must capture:

```md
- strong decision page
- primary keyword: best OpenClaw setup for beginners
- thesis: beginners should choose the simplest path, not the most flexible path
- role: first-batch conversion / recommendation page
```

- [ ] **Step 3: Write `openclaw-windows-wsl2.md`**

Must capture:

```md
- pain-point platform page
- primary keyword: OpenClaw Windows install WSL2
- thesis: most Windows users should start with WSL2 unless they have a very narrow reason not to
- role: first-batch platform pain-point page
```

### Task 3: Write the 3 AI procurement page briefs

**Files:**
- Create: `docs/plan2/launch-briefs/ai-procurement-options.md`
- Create: `docs/plan2/launch-briefs/ai-cheap-coding-models.md`
- Create: `docs/plan2/launch-briefs/direct-api-vs-openrouter.md`

- [ ] **Step 1: Write `ai-procurement-options.md`**

Must capture:

```md
- pillar / 总入口页
- primary keyword: AI coding model procurement options
- thesis: procurement is about purchase path and total cost, not just a static price table
- role: first-batch pillar page
```

- [ ] **Step 2: Write `ai-cheap-coding-models.md`**

Must capture:

```md
- strong commercial decision page
- primary keyword: best cheap model for coding agents
- thesis: low-cost for coding should mean usable total stack, not cheapest headline token price
- role: first-batch budget decision page
```

- [ ] **Step 3: Write `direct-api-vs-openrouter.md`**

Must capture:

```md
- high-controversy comparison page
- primary keyword: direct API vs OpenRouter
- thesis: routing convenience and direct purchase control win in different team conditions
- role: first-batch comparison page
```

### Task 4: Verify consistency and record session

**Files:**
- Modify: `Memory/03_chat_logs/2026-03-27_*.md`

- [ ] **Step 1: Verify files contain no placeholders**

Run:

```bash
rg -n "TODO|TBD|待补|未定" "d:\demo1\openfons\docs\plan2\launch-briefs"
```

Expected: no output

- [ ] **Step 2: Run markdown diff checks**

Run:

```bash
git -C "d:\demo1\openfons" diff --check -- "docs/plan2/launch-briefs"
```

Expected: no output

- [ ] **Step 3: Add a Memory chat log**

Write a summary describing that the 6 first-batch page briefs and ReportSpec docs were created from the page-level priority matrix.

- [ ] **Step 4: Commit**

```bash
git add "docs/plan2/launch-briefs" "Memory/03_chat_logs/2026-03-27_*.md"
git commit -m "docs(plan2): add first-batch launch briefs"
```
