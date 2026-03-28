# 2026-03-28 Cross-Case Findings

Gate Status: green
Blocked By: none
Next Unblock Action: start the minimal TypeScript demo plan only against the frozen future runtime chain below

## 1. Side-By-Side Comparison

| row | OpenClaw | AI procurement | current read |
| --- | --- | --- | --- |
| seed clarity | 高，用户问题天然围绕部署路径展开 | 高，用户问题天然围绕采购决策展开 | 两条线都有清晰 seed |
| role fit | 强 control / showcase | 强 beachhead candidate | 角色冻结有效 |
| hard-gate decisiveness | 强，能快速排除 managed/security/specs 页 | 强，能快速排除 country / tracker / tool-specific 页 | hard gates 是稳定机制 |
| opportunity narrowing | 从 10 个方向稳定收口到 `best VPS for OpenClaw` | 从 10 个方向稳定收口到 `direct API vs OpenRouter` | narrowing 已可复用 |
| evidence availability | 依赖现有 collector artifact bundles | 依赖官方 pricing docs + 最小 normalized captures | procurement 更依赖外部真源，OpenClaw 更依赖 repo-local artifacts |
| source-weighting difficulty | 中等 | 高 | procurement 的 source hygiene 更难 |
| evidence-set completeness | `partial but sufficient` | `partial but sufficient` | 两边都达到了可做 single-page brief 的门槛 |
| artifact binding quality | 强，已有双批次 bundle | 中等，靠人工 capture notes 补足 | OpenClaw 的 artifact 绑定更天然 |
| single-page thesis clarity | 高，VPS 决策页很清晰 | 很高，direct-vs-router 页面极清晰 | procurement 略胜一筹 |
| report-structure readiness | 高 | 很高 | 两边都能产出 ReportSpec |
| human-review burden | 中等 | 高 | procurement 仍需更多编辑审阅 |

## 2. Manual Validation Chain

当前人工验证主链冻结为：

`Seed -> Intent Notes -> Hard Gates -> Evidence Index -> EvidenceSet -> OpportunitySpec -> TaskSpec -> WorkflowSpec -> ReportSpec -> Human Review -> Cross-Case Findings`

### Already Reusable

1. `Hard Gates`
2. `Evidence Index` 的来源分层
3. `EvidenceSet` 的 claim 形状
4. `OpportunitySpec / TaskSpec / WorkflowSpec / ReportSpec` 的结构化输出

### Still Manual

1. 把用户 seed 收口成可执行方向池
2. winner / runner-up 的编辑判断
3. AI procurement 的最小 capture 归一化
4. commercial / discovery-only 来源的降权判断

## 3. Future Runtime Chain

未来最小 TypeScript demo 候选主链冻结为：

`OpportunitySpec -> TaskSpec -> WorkflowSpec -> EvidenceSet -> ReportSpec -> report-web`

### Already Reusable For Runtime

1. `OpportunitySpec`
2. `TaskSpec`
3. `WorkflowSpec`
4. `EvidenceSet`
5. `ReportSpec`

### Should Stay Out Of The First Demo

1. 10 方向池生成时的开放式 brainstorming
2. 大量 discovery-only 来源的广泛搜集
3. 复杂的 geo/country expansion
4. 需要人审的商业来源降权策略

### Missing Piece Before Full Automation

唯一最明显的缺口是：

`repo-local capture / artifact normalization 仍缺少统一的程序化入口`

OpenClaw 这边已有现成 artifact bundle，AI procurement 这边则靠人工写 normalized note 补齐。这个缺口不阻止 demo，但会影响 runtime 的自动化程度。

## 4. Go / No-Go Recommendation

- outcome: `Conditional Go`
- exact_reason: 两条实验都已经证明 `OpportunitySpec -> EvidenceSet -> ReportSpec` 这条核心契约足够稳定，可以开始最小 TypeScript demo；但在动手之前，必须先把 `repo-local capture / artifact normalization` 定义成一个明确的最小输入接口，否则 runtime demo 会在证据接入层反复返工。

## 5. Final Read

1. OpenClaw 证明了现有 collector artifact 能被收口进标准化 evidence 模型。
2. AI procurement 证明了高波动官方 pricing docs 也能被压到统一字段框架。
3. 这意味着下一步不必再做第三个案例，而应开始围绕 frozen future runtime chain 写最小 demo 计划。
