# Workbench

`docs/workbench` 是 OpenFons 当前活跃工作台，用于承载正在推进的架构辅助视图、机会判断、案例落地与页面规划材料。

这里不是正式 SoT。
如果本目录中的文档与 `docs/sot/**` 冲突，一律以 `docs/sot/**` 为准，再回头修工作台文档。

当前目录适合存放：
- 架构图与融合方案
- 对标分析与借鉴结论
- 机会门禁与评分体系
- 案例型规划文档
- 面向页面或交付物的 brief

## 2026-03-29 工作台治理说明

- 利基选题门禁与产品机会框架讨论.md、利基选题标准表-v1*.md、launch-briefs/ 中的旧评分、P0 / P1、第一批上线等表述，当前仅保留为历史规划基线与演化记录。
- 当前主线已从 2026-03-28 dual experiment 收口到单案例、证据优先的执行方式；若旧文档仍出现 dual experiment、winner、P0 / P1 或旧评分口径，默认视为历史记录，不视为当前排期。
- 当前执行若与本目录文档冲突，一律以 `docs/sot/**` 为准；若需要回看设计演化，再辅助参考 `docs/superpowers/**` 或 `docs/history/**`。
- 若旧文档与当前执行冲突，统一按 hard-gate-first 处理：先过 Authority / Distribution / Compliance / Maintenance Cost，再做次级排序与制品绑定验证。

## 推荐阅读顺序

1. 先看 `openfons-best-practice-architecture-2026-03-27.html`，快速建立整体架构印象。
2. 再看 `MiroFish与DeerFlow深度对比及对OpenFons的借鉴建议-2026-03-27.md`，理解为什么要这样分层，以及分别借鉴什么。
3. 然后看 `利基选题门禁与产品机会框架讨论.md` 与 `利基选题标准表-v1.md`，理解前置机会判断与早期评分方法，并注意其治理说明。
4. 再看 `OpenClaw部署SEO选题与报告案例.md` 和 `AI编程与Agent时代模型采购、路由、成本与地区选择系统案例.md`，把抽象架构对到真实案例。
5. 最后按需看 `launch-briefs/`、`利基选题标准表-v1-案例评分.md`、`利基选题标准表-v1-页面级优先级评分.md` 与 `openfons-architecture-fusion-map-2026-03-27.html`，用于页面规划、历史评分演示和补充对照。
