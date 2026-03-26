# Niche Opportunity Scorecard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the formal `docs/plan1/利基选题标准表-v1.md` document from the approved scorecard design so the team can score topics, split content vs product opportunity, and map outcomes to Phase 1 actions.

**Architecture:** Keep the implementation as a single primary plan1 document aligned with the existing `v1 opportunity gate` and `OpportunitySpec` boundary. The document should combine handbook-style explanation, score tables, decision mapping, and two worked examples without introducing new external contracts.

**Tech Stack:** Markdown documentation, existing `docs/plan1` planning docs, Git

---

### Task 1: Create the formal scorecard document

**Files:**
- Create: `docs/plan1/利基选题标准表-v1.md`
- Reference: `docs/superpowers/specs/2026-03-26-niche-opportunity-scorecard-design.md`
- Reference: `docs/plan1/利基选题门禁与产品机会框架讨论.md`
- Reference: `docs/plan1/开放源平台技术团队说明.md`

- [ ] **Step 1: Draft the document skeleton**

Use this section order:

```md
# 利基选题标准表 v1

## 1. 文档目的与状态
## 2. 为什么采用“三层结构”
## 3. 使用方式
## 4. 总门禁表
## 5. 内容机会子表
## 6. 产品机会子表
## 7. 决策映射规则
## 8. 复盘机制
## 9. 示例一：OpenClaw
## 10. 示例二：AI procurement
## 11. 当前边界与迭代原则
```

- [ ] **Step 2: Write the handbook explanations**

Include these explicit rules:

```md
- 标准表是 `v1 opportunity gate` 的操作化版本，不是最终法规
- 采用 `1 个总门禁 + 2 个子评分表`
- Phase 1 默认仍以 `report-web / Next.js 报告页` 验证为主
- 产品机会结果先保留为 `productOpportunityHints / expansionCandidates`
```

- [ ] **Step 3: Write the total gate score table**

Include the exact dimensions and rules:

```md
| 维度 | 问题 | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- | --- |
| Problem | 用户问题是否具体而真实 | ... | ... | ... | ... |
| Intent | 是否存在明确决策意图或高价值执行意图 | ... | ... | ... | ... |
| Audience | 目标人群是否清晰 | ... | ... | ... | ... |
| Market Context | 地区/语言/平台是否可判断 | ... | ... | ... | ... |
| Evidence | 是否有足够公开证据可交叉验证 | ... | ... | ... | ... |
| Gap | 是否存在明确切入空位 | ... | ... | ... | ... |
| Monetization | 是否存在明确变现路径 | ... | ... | ... | ... |
| Updateability | 是否适合持续更新 | ... | ... | ... | ... |
```

Also include:

```md
- 红线项：Intent / Evidence / Gap / Monetization
- 上限规则：Audience 或 Market Context 未收敛时最高只能到 Hold
- 判定优先级：红线项 -> 上限规则 -> 总分区间
- 结论区间：Go / Hold / No-Go
```

- [ ] **Step 4: Write the content and product sub-score tables**

Use these dimension groups:

```md
内容机会子表：
- Query / Distribution Fit
- Angle Clarity
- Evidence Depth
- Update Loop
- Content Gap
- Content Monetization Fit

产品机会子表：
- Repetition
- Parameterizability
- Structured Output
- Willingness To Pay
- Subscription Fit
- Data / Workflow Moat
```

Each dimension must include `0 / 1 / 2 / 3` anchors and one high-score vs low-score explanation.

- [ ] **Step 5: Add the decision mapping and replay fields**

Include this exact action mapping:

```md
- Total No-Go -> 直接归档
- Total Hold + 任一子表 Go -> 观察池，先补研究
- Total Go + Content-Go + Product-No-Go/Hold -> `report-web` 优先
- Total Go + Content-Hold/No-Go + Product-Go -> 产品探索池
- Total Go + Content-Go + Product-Go -> 报告页先验证，同时记录产品化候选
- Total Go + Content-Hold + Product-Hold -> 不立即启动，先补证据或换角度
```

Also include the record fields:

```md
Topic / Seed Question / Audience / Geo / Language / Assumptions /
Total Gate Score / Content Opportunity Score / Product Opportunity Score /
Decision / Recommended Phase 1 Action / Key Evidence / Open Risks /
Review Date / Replay Notes / Confidence Level / Actual Outcome Snapshot
```

- [ ] **Step 6: Add the two worked examples**

Create scored examples for:

```md
1. OpenClaw 部署 SEO 主题
2. AI coding / agent 模型采购、路由、成本与地区选择
```

Each example must show:

```md
- 简短题目定义
- 总门禁评分摘要
- 内容机会评分摘要
- 产品机会评分摘要
- 决策结论
- 第一阶段建议动作
```

- [ ] **Step 7: Verify the document is structurally complete**

Run:

```bash
rg -n "TODO|TBD|待补|未定" "d:\demo1\openfons\docs\plan1\利基选题标准表-v1.md"
```

Expected: no output

- [ ] **Step 8: Commit**

```bash
git add "docs/plan1/利基选题标准表-v1.md"
git commit -m "docs(plan1): add niche opportunity scorecard v1"
```

### Task 2: Record the session summary in Memory

**Files:**
- Create: `Memory/03_chat_logs/2026-03-26_18-xx.md`

- [ ] **Step 1: Write the chat log summary**

Use this structure:

```md
# YYYY-MM-DD HH:MM 会话记录

---
时间: ...
用户: 确认利基选题标准表设计稿，并要求先修复后落正式文档。
助手: 基于已确认的设计稿，完成两轮 review 收口，补入上限规则、判定优先级、决策映射矩阵、评分锚点要求，随后将正式版 `docs/plan1/利基选题标准表-v1.md` 落地为可执行的内部评审表 + 说明书文档。
```

- [ ] **Step 2: Verify the file exists**

Run:

```bash
Get-Item "d:\demo1\openfons\Memory\03_chat_logs\2026-03-26_18-xx.md"
```

Expected: file metadata is printed
