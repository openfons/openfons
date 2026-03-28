# OpenClaw + AI Procurement Dual Experiment Execution TODO

## Goal

用两条受控案例链路，验证 OpenFons 现阶段的人工规划管线是否已经足够稳定，能够把自然语言问题收口成：

`OpportunitySpec -> Evidence Index -> EvidenceSet -> TaskSpec -> WorkflowSpec -> ReportSpec`

## Working Rules

1. 本轮先做人工跑通，不写生产代码。
2. 本轮只做两个案例，不额外扩第三个题目。
3. 本轮不重新打开公司级 GTM 争论：`AI procurement` 是 beachhead candidate，`OpenClaw` 是 showcase/control case。
4. 每个案例都必须同时完成“portfolio 级方向判断”和“单页级落地判断”。
5. 旧的 `Demand / Evidence / Difficulty / Business / Updateability` 五维表只作为参考，不再单独决定 winner。
6. 任何方向都必须先过 `Authority / Distribution / Compliance / Maintenance Cost` 四个 hard gates；未通过者标记为 `blocked` 或 `lab-only`，不得获胜。
7. 任何结论都必须能回到 `official / community / commercial / discovery-only` 这四类来源权重，并绑定至少一个 repo-local artifact 或 capture example。
8. cross-case findings 必须明确区分 `manual validation chain` 和 `future runtime chain`。
9. 所有实验输出统一落在 `docs/plan2/experiments/`。

## Planned Deliverables

- [ ] `docs/plan2/experiments/README.md`
- [ ] `docs/plan2/experiments/2026-03-28-openclaw-runthrough.md`
- [ ] `docs/plan2/experiments/2026-03-28-openclaw-evidence-index.md`
- [ ] `docs/plan2/experiments/2026-03-28-openclaw-evidence-set.md`
- [ ] `docs/plan2/experiments/2026-03-28-ai-procurement-runthrough.md`
- [ ] `docs/plan2/experiments/2026-03-28-ai-procurement-evidence-index.md`
- [ ] `docs/plan2/experiments/2026-03-28-ai-procurement-evidence-set.md`
- [ ] `docs/plan2/experiments/2026-03-28-cross-case-findings.md`

## Phase 0: Workspace Setup

- [ ] 建立 `docs/plan2/experiments/` 目录
- [ ] 写 `README.md`，明确 runthrough、evidence-index、cross-case findings 的用途
- [ ] 确认本轮不写生产代码，只产出决策文档

## Phase 1: OpenClaw Case

- [ ] 重读 [OpenClaw部署SEO选题与报告案例.md](D:\demo1\openfons\docs\plan2\OpenClaw部署SEO选题与报告案例.md)
- [ ] 把 10 个方向先按 `planning_hypothesis` 落入 runthrough 文档
- [ ] 建立 OpenClaw evidence index，并给每条来源打 `use_as` 标签
- [ ] 在 OpenClaw evidence index 里补 `Artifact Binding` 小节，并绑定至少一个已有 OpenClaw artifact bundle
- [ ] 从 evidence index 中抽出当前所选单页的 OpenClaw `EvidenceSet`
- [ ] 先补齐 `Authority / Distribution / Compliance / Maintenance Cost` 四个 hard gates，并标记 `pass / blocked / lab-only`
- [ ] 仅对 hard-gate 通过的方向补齐 `Demand / Evidence / Difficulty / Business / Updateability` 次级评分
- [ ] 根据 hard gates、次级评分和证据说明选定第一条单页方向，不预先写死 winner
- [ ] 在 runthrough 里记录 winner、runner-up 和取舍理由
- [ ] 在 runthrough 里记录哪些方向被 hard gates 拦下，以及原因
- [ ] 写出该方向的 `OpportunitySpec`
- [ ] 写出该方向的 `TaskSpec`
- [ ] 写出该方向的 `WorkflowSpec`
- [ ] 写出该方向的 `ReportSpec`
- [ ] 在 OpenClaw `EvidenceSet` 里给每条 claim 补 `artifact_refs`
- [ ] 写出 OpenClaw track 的 `Experiment Verdict`

## Phase 2: AI Procurement Case

- [ ] 重读 [AI编程与Agent时代模型采购、路由、成本与地区选择系统案例.md](D:\demo1\openfons\docs\plan2\AI编程与Agent时代模型采购、路由、成本与地区选择系统案例.md)
- [ ] 把 10 个方向先按 `planning_hypothesis` 落入 runthrough 文档
- [ ] 建立 procurement evidence index，并给每条来源打 `use_as` 标签
- [ ] 在 procurement evidence index 里补 `Artifact Binding` 小节，并绑定至少一个 repo-local procurement capture example；若暂无则先补最小 capture
- [ ] 冻结 procurement 最小 capture 格式：`capture_id / source_url / captured_on / repo_local_artifact_path / artifact_type / normalization_note / comparison_fields_supported`
- [ ] 从 evidence index 中抽出当前所选单页的 procurement `EvidenceSet`
- [ ] 先补齐 `Authority / Distribution / Compliance / Maintenance Cost` 四个 hard gates，并标记 `pass / blocked / lab-only`
- [ ] 固定成本归一化字段：
  - `base_input_price`
  - `base_output_price`
  - `cached_input_price`
  - `tool_call_or_extra_cost`
  - `region_availability`
  - `billing_notes`
  - `source_timestamp`
- [ ] 仅对 hard-gate 通过的方向补齐 `Demand / Evidence / Difficulty / Business / Updateability` 次级评分，再决定 winner
- [ ] 根据评分和证据说明选定第一条单页方向，不预先写死 winner
- [ ] 如果选的是比较页，先冻结 comparison cohort，再写任何结论
- [ ] 在 runthrough 里记录 winner、runner-up、cohort 边界、hard-gate 拦截项和取舍理由
- [ ] 写出该方向的 `OpportunitySpec`
- [ ] 写出该方向的 `TaskSpec`
- [ ] 写出该方向的 `WorkflowSpec`
- [ ] 写出该方向的 `ReportSpec`
- [ ] 在 procurement `EvidenceSet` 里给每条 claim 补 `artifact_refs`
- [ ] 写出 procurement track 的 `Experiment Verdict`

## Phase 3: Cross-Case Findings

- [ ] 比较两条实验在 `seed clarity` 上的稳定度
- [ ] 比较两条实验在 `role fit` 上的稳定度
- [ ] 比较两条实验在 `hard-gate decisiveness` 上的稳定度
- [ ] 比较两条实验在 `opportunity narrowing` 上的稳定度
- [ ] 比较两条实验在 `evidence availability` 上的稳定度
- [ ] 比较两条实验在 `source-weighting difficulty` 上的稳定度
- [ ] 比较两条实验在 `evidence-set completeness` 上的稳定度
- [ ] 比较两条实验在 `artifact binding quality` 上的稳定度
- [ ] 比较两条实验在 `single-page thesis clarity` 上的稳定度
- [ ] 比较两条实验在 `report-structure readiness` 上的稳定度
- [ ] 比较两条实验在 `human-review burden` 上的稳定度
- [ ] 冻结 `manual validation chain`：
  - `Seed -> Intent Notes -> Hard Gates -> Evidence Index -> EvidenceSet -> OpportunitySpec -> TaskSpec -> WorkflowSpec -> ReportSpec -> Human Review -> Cross-Case Findings`
- [ ] 冻结 `future runtime chain`：
  - `OpportunitySpec -> TaskSpec -> WorkflowSpec -> EvidenceSet -> ReportSpec -> report-web`
- [ ] 给出面向 `future runtime chain` 的 `Go / Conditional Go / No-Go` 结论
- [ ] 写清楚为什么是这个结论

## Exit Gate

- [ ] 两个案例都完成了 runthrough
- [ ] 两个案例都完成了 evidence index
- [ ] 两个案例都完成了 EvidenceSet
- [ ] 两个案例都完成了 hard-gate 审查
- [ ] 两个案例都绑定了 repo-local artifact 或 capture example
- [ ] 两个案例都完成了单页级结构化 spec
- [ ] 已完成 cross-case findings
- [ ] 已明确下一步是否进入最小 TypeScript demo，并且结论只针对 `future runtime chain`

## Handoff Rule

- [ ] 只有当 `docs/plan2/experiments/2026-03-28-cross-case-findings.md` 针对 `future runtime chain` 给出 `Go` 或 `Conditional Go` 结论后，才开始下一轮最小 TypeScript demo 计划
