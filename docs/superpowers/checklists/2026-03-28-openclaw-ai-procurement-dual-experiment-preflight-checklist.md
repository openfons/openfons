# OpenClaw + AI Procurement Dual Experiment Preflight Checklist

## Purpose

在开始和推进 `runthrough / evidence-index / evidence-set / cross-case findings` 的过程中，用这份清单确认本轮双案例实验没有偏离已冻结的执行口径。

相关输入：
- `docs/superpowers/plans/2026-03-28-openclaw-ai-procurement-dual-experiment-plan.md`
- `docs/superpowers/plans/2026-03-28-openclaw-ai-procurement-dual-experiment-todo.md`
- `Memory/01_goals/goal_v003_20260325.md`
- `Memory/02_todos/todo_v003_001_20260325.md`

## Rule

- 任意一项未通过，先补约束或补证据，不进入下一阶段。
- `Go / Conditional Go / No-Go` 只允许对 `future runtime chain` 下结论。

## How To Use

这份清单分 3 个阶段使用，不是一次性在开跑前全部打勾：

### Stage A: Start Gate

在开始写方向判断、hard-gate 审查和 winner 讨论前，先完成：
- Check 1: Role Freeze
- Check 2: Hard Gates First

### Stage B: Case Gate

在开始写 claim、`EvidenceSet`、`TaskSpec / WorkflowSpec / ReportSpec` 前，分别完成：
- Check 3: Real Evidence Binding
- Check 4: Procurement Comparison Discipline

### Stage C: Final Gate

在开始写 `Experiment Verdict` 和 cross-case 结论前，完成：
- Check 5: Chain Separation
- Check 6: Evidence Model Alignment

## Check 1: Role Freeze

- [ ] 当前执行文本明确固定：`AI procurement = beachhead candidate`
- [ ] 当前执行文本明确固定：`OpenClaw = showcase/control case`
- [ ] 当前 runthrough 没有把两条线写成同权 GTM winner

通过标准：
- 当前 case 文档和执行笔记里，角色表述一致，没有边做边改定位。

未通过时：
- 先修正文档和执行口径，再继续后续评分或写结论。

## Check 2: Hard Gates First

- [ ] 所有候选方向先做 `Authority / Distribution / Compliance / Maintenance Cost`
- [ ] 未通过 hard gates 的方向已标记为 `blocked` 或 `lab-only`
- [ ] 次级评分只用于 hard-gate survivor
- [ ] winner 不是在 hard-gate 审查前预先写死的

通过标准：
- 所有排名、取舍和 winner 结论都能回溯到 hard-gate 审查结果。

未通过时：
- 不进入次级评分，不进入 winner 选择。
- 撤回已有 winner 结论，先补 hard-gate 审查，再恢复排序。

## Check 3: Real Evidence Binding

- [ ] OpenClaw case 已绑定至少一个 repo-local artifact bundle
- [ ] AI procurement case 已绑定至少一个 repo-local capture example
- [ ] 当前进入 claim 写作的 case 已为每条核心 claim 预留 `artifact_refs`
- [ ] 当前进入 claim 写作的 case 的核心 claim 都能回到 `official / community / commercial / discovery-only` 来源层级

通过标准：
- 不是只靠手工摘要或印象判断；关键 claim 都能定位到真实 artifact 或 capture。

未通过时：
- 不进入 claim 写作，不进入 `EvidenceSet`，不进入该 case 的结构化 spec。
- 先补 artifact binding 或最小 capture，再继续。

## Check 4: Procurement Comparison Discipline

- [ ] 如果 AI procurement 当前选的是比较页，comparison cohort 已先冻结
- [ ] 已明确 in-scope providers / platforms
- [ ] 已明确 obvious exclusions 和 future cohort expansion rule
- [ ] 已冻结固定 normalization frame：
  - `base_input_price`
  - `base_output_price`
  - `cached_input_price`
  - `tool_call_or_extra_cost`
  - `region_availability`
  - `billing_notes`
  - `source_timestamp`

通过标准：
- AI procurement 不会退化成模糊的全局价格表；后续比较 claim 都有统一 cohort 和统一字段框架。

未通过时：
- 不进入 procurement claim 写作，不进入 procurement `EvidenceSet`，不进入 procurement `ReportSpec`。

## Check 5: Chain Separation

- [ ] `manual validation chain` 已单独冻结
- [ ] `future runtime chain` 已单独冻结
- [ ] cross-case findings 没有把 manual artifacts 直接当 runtime contract
- [ ] `Go / Conditional Go / No-Go` 明确只指向 `future runtime chain`

通过标准：
- 读文档的人能清楚分辨：这轮哪些是人工验证步骤，哪些才是后续 TypeScript demo 的候选主链。

未通过时：
- 先改 cross-case findings 结构，避免 manual/runtime 边界再次混掉。

## Check 6: Evidence Model Alignment

- [ ] OpenClaw case 至少有一个现有 collector 输出被映射到目标 `EvidenceSet` 形状
- [ ] AI procurement case 至少有一个现有 collector 输出或最小 capture 被映射到目标 `EvidenceSet` 形状
- [ ] 两个 case 都已记录各自映射依赖了哪些人工归一化步骤
- [ ] 两个 case 都已明确当前 collector 产物对该 case 是 `sufficient / partial / insufficient`
- [ ] 当前实验没有脱离 active goal 的“采集能力优先验证”主线

通过标准：
- 这轮实验不只是得到一套好看的 spec，而是真的回答“现有采集产物能不能喂进标准化 evidence 模型”。

未通过时：
- 不进入任一 case 的 `Experiment Verdict`，不进入 cross-case `Go / Conditional Go / No-Go`。
- 先补最小映射样例和归一化说明，再继续。

## Exit Gate

- [ ] 6 个检查项全部为绿
- [ ] OpenClaw case 已单独完成 Stage A / B / C 自检
- [ ] AI procurement case 已单独完成 Stage A / B / C 自检
- [ ] 只有在全绿后，才开始写 `Experiment Verdict` 或 `future runtime chain` 的建议结论

## Recommended Status Line

执行时建议在每个 case 文档顶部附一行状态，避免口径漂移：

```text
Gate Status: stage-a-pending / stage-b-pending / final-gate-pending / blocked / green
Blocked By:
Next Unblock Action:
```
