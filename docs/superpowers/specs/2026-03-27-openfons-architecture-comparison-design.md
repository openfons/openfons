# OpenFons 架构对照页设计说明

日期：2026-03-27

## 目标

产出一个单页 HTML，把 `MiroFish`、`DeerFlow` 与目标态 `OpenFons` 放在同一视图中对照，帮助团队快速回答两个问题：

1. 这三个系统在大逻辑上为什么相似。
2. OpenFons 应该分别借鉴哪一层，而不是整体照搬哪一个项目。

这页需要同时服务产品讨论和工程讨论：

1. 非工程角色能顺着页面读懂“三者像在哪里、差在哪里、为什么不能二选一”。
2. 工程角色能直接把它当作模块拆分与边界讨论的参考图。

## 受众

- 内部产品与架构讨论
- 技术方案评审
- 与创始人、投资人或关键干系人的策略对齐

## 推荐结构

页面采用“上半讲产品与流程，下半讲工程分层与融合方案”的混合结构：

1. 三个项目的定位差异
2. 三条端到端流程对照
3. 四层架构映射
4. OpenFons 最佳实践融合架构
5. 推荐借鉴与明确避免
6. 推荐演进路线

## 核心信息

- `MiroFish` 最强的是垂直产品壳、需求编译感和可视化交付体验。
- `DeerFlow` 最强的是横向 agent harness、执行 runtime、skills / tools / sub-agents / sandbox / provider adapters 的组织方式。
- `OpenFons` 不能丢掉自己的控制面和 evidence-first 核心，而应在此基础上借 DeerFlow 的执行层组织、借 MiroFish 的交付表达。

## 页面必须明确传达的结论

### 1. 三者属于同一宏观家族

它们都在做同一类事情：把用户意图转换成 AI 参与的执行流程，最后交付结果。

### 2. 三者的重心不同

- `MiroFish`：更偏 requirement compilation、simulation world 与报告产品化
- `DeerFlow`：更偏 task execution harness、tools、sub-agents、sandbox、provider adapters
- `OpenFons`：更偏 opportunity judgment、user confirmation、task compilation、controlled collection、evidence accumulation 与 artifact delivery

### 3. OpenFons 不能整体照搬其中任何一个

页面必须讲清楚以下边界：

- OpenFons 不能用通用 planner 替代 `OpportunitySpec`
- OpenFons 不能把 simulation 当成 `v1` 默认主链
- OpenFons 不能跳过 `User Confirmation -> Task Compiler -> TaskSpec / WorkflowSpec`
- OpenFons 必须把 evidence assets 与 report contracts 视为长期真源

## 视觉方向

- 单文件静态 HTML
- 不是普通文档排版，而是更接近编辑化的对照展示页
- 暖色中性背景，配合不同颜色的架构卡片
- 用清晰的 section 分隔、流程卡片和分层块状结构
- 在桌面端与移动端都能稳定阅读
- 即使离开设计说明单独浏览 HTML，页面也应具备基本元信息、字体策略与表格语义

## 交付物

1. `docs/plan2/` 下的一份静态 HTML 页面
2. 一段明确说明“该借什么、不该借什么”的内容
3. 一份用 HTML/CSS 块状结构呈现的融合架构图，而不只是文字描述

## 验收检查

- 读者应能在两分钟内看懂三个系统的差异与相互关系
- 读者应能指出 OpenFons 的哪一层借鉴哪一个参考项目
- 页面必须保留 OpenFons 当前正式主链的关键控制步骤：
  `User Input -> Intent Structuring -> Planning Swarm -> Opportunity Judge -> OpportunitySpec -> User Confirmation -> Task Compiler -> TaskSpec / WorkflowSpec -> Controlled Collection / Worker Execution -> EvidenceSet -> ReportSpec -> Artifact`
- 页面不能把 `OpportunitySpec -> EvidenceSet -> ReportSpec` 压缩成唯一完整主链表述，否则会丢失确认与任务编译门禁

## 本次修订关注点

本次文档修订重点修复三件事：

1. 把 HTML 中被压缩过度的 OpenFons 主链恢复到与正式技术文档一致的粒度
2. 为单文件 HTML 补上基础元信息、字体策略与表格语义，降低跨环境漂移
3. 让页面文案、设计说明、现有技术规划三者使用同一套架构语言
