# OpenClaw + AI Procurement Experiment Workspace

本目录用于承接 2026-03-28 双案例人工实验，不写生产代码，只产出可评审、可交接的决策文档。

## Artifact Contract

1. `runthrough` 文件记录从 seed question 到单页方向 winner 的完整规划链路。
2. `evidence-index` 文件按 `official / community / commercial / discovery-only` 四类来源归档来源，并保留访问日期与纳入原因。
3. `evidence-set` 文件只保留单页 winner 需要的 claim-ready 证据对象，不再承载全量发现笔记。
4. 每条事实来源都必须包含 `accessed_on` 与简短 `note`，说明它支持哪类判断。
5. 每条实验链必须同时覆盖 portfolio 级方向判断和 single-page 级落地判断。
6. 本阶段只产出决策与结构化契约，不写 TypeScript runtime、Next.js 页面或其他生产代码。
7. 所有方向必须先过 `Authority / Distribution / Compliance / Maintenance Cost` 四个 hard gates，再做次级排序。
8. 每个 winner 都必须回指至少一个 repo-local artifact bundle 或最小 capture example。
9. `cross-case findings` 必须明确区分 `manual validation chain` 与 `future runtime chain`。

## File Roles

- `2026-03-28-*-runthrough.md`: 当前 case 的完整执行链、winner 选择、结构化 spec、实验结论。
- `2026-03-28-*-evidence-index.md`: 当前 case 的来源分层、使用权重、artifact binding。
- `2026-03-28-*-evidence-set.md`: 当前 case 的单页 claim 集合。
- `2026-03-28-cross-case-findings.md`: 两条线的统一比较、manual/runtime 边界、Go 判断。

## Working Discipline

1. 旧案例文档里的方向池与优先级仅作为 `planning_hypothesis`，不是当前实验的默认 winner。
2. OpenClaw 维持 `showcase/control case` 角色；AI procurement 维持 `beachhead candidate` 角色。
3. 只要任一 case 没有真实 artifact binding，就不能进入对应 `EvidenceSet` 与结构化 spec。
4. `Go / Conditional Go / No-Go` 只允许指向 `future runtime chain`。
