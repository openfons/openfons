# OpenClaw + AI Procurement Dual Experiment Execution TODO

> **Governance note (2026-03-29):** This TODO list is preserved as historical execution context only. The current active path is the single-case, evidence-first chain governed by `docs/sot/**` and the live materials under `docs/workbench/**`, so this file should not be read as the current delivery queue.

## Goal

用两条受控案例链路，验证 OpenFons 现阶段的人工规划管线是否已经足够稳定，能够把自然语言问题收口成：

`OpportunitySpec -> Evidence Index -> EvidenceSet -> TaskSpec -> WorkflowSpec -> ReportSpec`

## Working Rules

1. 本轮先做人工跑通，不写生产代码。
2. 本轮只做两个案例，不额外扩第三个题目。
3. 每个案例都必须同时完成“portfolio 级方向判断”和“单页级落地判断”。
4. 任何结论都必须能回到 `official / community / commercial / discovery-only` 这四类来源权重。
5. 所有实验输出统一落在 `docs/workbench/experiments/`。

## Planned Deliverables

- [ ] `docs/workbench/experiments/README.md`
- [ ] `docs/workbench/experiments/2026-03-28-openclaw-runthrough.md`
- [ ] `docs/workbench/experiments/2026-03-28-openclaw-evidence-index.md`
- [ ] `docs/workbench/experiments/2026-03-28-openclaw-evidence-set.md`
- [ ] `docs/workbench/experiments/2026-03-28-ai-procurement-runthrough.md`
- [ ] `docs/workbench/experiments/2026-03-28-ai-procurement-evidence-index.md`
- [ ] `docs/workbench/experiments/2026-03-28-ai-procurement-evidence-set.md`
- [ ] `docs/workbench/experiments/2026-03-28-cross-case-findings.md`

## Phase 0: Workspace Setup

- [ ] 建立 `docs/workbench/experiments/` 目录
- [ ] 写 `README.md`，明确 runthrough、evidence-index、cross-case findings 的用途
- [ ] 确认本轮不写生产代码，只产出决策文档

## Phase 1: OpenClaw Case

- [ ] 重读 [OpenClaw部署SEO选题与报告案例.md](D:\demo1\openfons\docs\workbench\OpenClaw部署SEO选题与报告案例.md)
- [ ] 把 10 个方向先按 `planning_hypothesis` 落入 runthrough 文档
- [ ] 建立 OpenClaw evidence index，并给每条来源打 `use_as` 标签
- [ ] 从 evidence index 中抽出当前所选单页的 OpenClaw `EvidenceSet`
- [ ] 补齐 `Demand / Evidence / Difficulty / Business / Updateability` 五维评分
- [ ] 根据评分和证据说明选定第一条单页方向，不预先写死 winner
- [ ] 在 runthrough 里记录 winner、runner-up 和取舍理由
- [ ] 写出该方向的 `OpportunitySpec`
- [ ] 写出该方向的 `TaskSpec`
- [ ] 写出该方向的 `WorkflowSpec`
- [ ] 写出该方向的 `ReportSpec`
- [ ] 写出 OpenClaw track 的 `Experiment Verdict`

## Phase 2: AI Procurement Case

- [ ] 重读 [AI编程与Agent时代模型采购、路由、成本与地区选择系统案例.md](D:\demo1\openfons\docs\workbench\AI编程与Agent时代模型采购、路由、成本与地区选择系统案例.md)
- [ ] 把 10 个方向先按 `planning_hypothesis` 落入 runthrough 文档
- [ ] 建立 procurement evidence index，并给每条来源打 `use_as` 标签
- [ ] 从 evidence index 中抽出当前所选单页的 procurement `EvidenceSet`
- [ ] 固定成本归一化字段：
  - `base_input_price`
  - `base_output_price`
  - `cached_input_price`
  - `tool_call_or_extra_cost`
  - `region_availability`
  - `billing_notes`
  - `source_timestamp`
- [ ] 根据评分和证据说明选定第一条单页方向，不预先写死 winner
- [ ] 如果选的是比较页，先冻结 comparison cohort，再写任何结论
- [ ] 在 runthrough 里记录 winner、runner-up、cohort 边界和取舍理由
- [ ] 写出该方向的 `OpportunitySpec`
- [ ] 写出该方向的 `TaskSpec`
- [ ] 写出该方向的 `WorkflowSpec`
- [ ] 写出该方向的 `ReportSpec`
- [ ] 写出 procurement track 的 `Experiment Verdict`

## Phase 3: Cross-Case Findings

- [ ] 比较两条实验在 `seed clarity` 上的稳定度
- [ ] 比较两条实验在 `opportunity narrowing` 上的稳定度
- [ ] 比较两条实验在 `evidence availability` 上的稳定度
- [ ] 比较两条实验在 `source-weighting difficulty` 上的稳定度
- [ ] 比较两条实验在 `evidence-set completeness` 上的稳定度
- [ ] 比较两条实验在 `single-page thesis clarity` 上的稳定度
- [ ] 比较两条实验在 `report-structure readiness` 上的稳定度
- [ ] 比较两条实验在 `human-review burden` 上的稳定度
- [ ] 冻结一个最小可复用链路：
  - `Seed -> Intent Notes -> OpportunitySpec -> Evidence Index -> EvidenceSet -> TaskSpec -> WorkflowSpec -> ReportSpec -> Human Review`
- [ ] 给出 `Go / Conditional Go / No-Go` 结论
- [ ] 写清楚为什么是这个结论

## Exit Gate

- [ ] 两个案例都完成了 runthrough
- [ ] 两个案例都完成了 evidence index
- [ ] 两个案例都完成了 EvidenceSet
- [ ] 两个案例都完成了单页级结构化 spec
- [ ] 已完成 cross-case findings
- [ ] 已明确下一步是否进入最小 TypeScript demo

## Handoff Rule

- [ ] 只有当 `docs/workbench/experiments/2026-03-28-cross-case-findings.md` 给出 `Go` 或 `Conditional Go` 结论后，才开始下一轮最小 TypeScript demo 计划
