# Docs Index

`docs/` 是 OpenFons 当前文档体系的总入口。

如果你现在要快速进入项目，先记住这条主线：

1. `docs/sot`
   当前唯一正式真源
2. `docs/workbench`
   当前活跃工作台
3. `docs/history`
   统一历史层
4. `docs/superpowers`
   设计稿、执行计划、迁移记录等过程文档

## 四层目录怎么理解

### `docs/sot`

`sot` 是 Source of Truth。

这里的文档不属于单一阶段，而是跨阶段长期有效的总纲。其他目录和总纲冲突时，以这里为准。

适合：
- 对齐技术真源
- 对齐对外叙事
- 判断阶段文档是否偏离主线

推荐先读：
- `docs/sot/README.md`
- `docs/sot/开放源平台技术团队说明.md`
- `docs/sot/开放源平台当前正式架构说明.md`
- `docs/sot/开放源平台投资人说明.md`

### `docs/workbench`

用来回答：
- 当前正在施工的架构和案例是什么
- 当前工作台里的机会门禁、评分体系、案例和页面规划怎么落地
- 哪些文档是活跃工作材料，哪些只是历史辅助视图

适合：
- 做当前产品与架构讨论
- 做案例推演
- 做页面和机会规划

推荐先读：
- `docs/workbench/README.md`
- `docs/workbench/openfons-best-practice-architecture-2026-03-27.html`
- `docs/workbench/MiroFish与DeerFlow深度对比及对OpenFons的借鉴建议-2026-03-27.md`

### `docs/history`

这里统一收口历史背景、旧规划、阶段验证和原始输入。

它们仍然有价值，但默认不作为当前正式口径或当前施工入口。

适合：
- 回看历史判断与架构演进
- 查第一阶段验证边界
- 核对原始输入与参考材料
- 追溯为什么曾经做出某些路线选择

推荐先读：
- `docs/history/README.md`
- `docs/history/plan/openfons双阶段演进架构方案.md`
- `docs/history/plan1/README.md`
- `docs/history/references/README.md`

### `docs/superpowers`

这里放的是工作过程文档：
- 设计稿
- 实施计划
- 迁移说明
- 执行辅助文档

它们很重要，但它们描述的是“当时怎么设计、怎么执行”，不等于当前正式归档位置。

适合：
- 回看方案演化过程
- 理解当时怎么落地
- 查计划与执行记录

推荐先读：
- `docs/superpowers/README.md`

## 新人最快阅读顺序

1. 先读 `docs/sot/README.md`
2. 再读 `docs/sot/开放源平台技术团队说明.md`
3. 再按任务进入 `docs/workbench/README.md`
4. 需要背景材料时再读 `docs/history`
5. 只有要追溯过程时再读 `docs/superpowers`

## 目录治理

当前顶层文档结构统一为：
- `docs/sot`
- `docs/workbench`
- `docs/history`
- `docs/superpowers`
