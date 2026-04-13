# OpenFons v001-v012 演化总表

> 文档定位：工作台复盘文档，不替代 `docs/sot/**`。  
> 生成日期：2026-04-13  
> 目的：用一页把 `Memory/01_goals` 与 `Memory/02_todos` 的演化拉平，回答“我们到底在做什么、为什么这样切线、下一步该怎么选”。

## 一句话结论

OpenFons 不是单纯爬虫仓库，不是单纯内容站，也不是纯聊天 Agent。它正在建设的是一个 `source-native` 的研究、情报与内容交付平台：把用户问题编译成结构化机会与任务，再通过受控采集、证据沉淀和交付编排，生成可公开发布、可复核、可变现的研究型报告页与后续资产。

最近几轮从 `search-gateway`、`crawler execution`、`artifact delivery` 到 `config-center` 的工程工作，本质上是在给这条产品链补平台底座，而不是偏离业务方向。

## 两条主线

### 业务主线

业务主线回答“为什么做这个平台”。

1. 用户输入不是最终页面标题，而是研究 seed。
2. 系统先判断是否存在可执行、可交付、可获得流量或业务价值的机会。
3. 通过 `OpportunitySpec / TaskSpec / WorkflowSpec / ReportSpec` 固化任务边界。
4. 通过多源采集与证据沉淀形成 `EvidenceSet`。
5. 最终交付公开研究页、报告、视频派生、工具或订阅机会。

这条主线在工作台中主要由这些文档表达：

- `docs/workbench/北美利基内容采集、分析与内容变现路线.md`
- `docs/workbench/利基选题门禁与产品机会框架讨论.md`
- `docs/workbench/OpenClaw部署SEO选题与报告案例.md`
- `docs/workbench/AI编程与Agent时代模型采购、路由、成本与地区选择系统案例.md`

### 工程主线

工程主线回答“为了让业务链稳定运行，底层必须先补什么”。

1. `search-gateway`：把搜索发现从临时调用变成可路由、可降级、可诊断的能力。
2. `crawler execution`：把 crawler adapter 从配置对象推进到真实执行路径。
3. `runtime diagnostics / smoke`：把真实外部运行条件暴露为可执行 blocker。
4. `artifact delivery`：把内存态报告推进到 file-backed 正式交付物。
5. `config-center`：统一 search、browser、crawler、account、cookie、proxy 的配置、secret、校验、解析和运营闭环。

这条主线在过程文档中主要由这些设计与计划表达：

- `docs/superpowers/specs/2026-03-30-search-gateway-v1-design.md`
- `docs/superpowers/specs/2026-04-09-crawler-execution-closure-design.md`
- `docs/superpowers/specs/2026-04-10-crawler-runtime-preflight-and-secret-bootstrap-design.md`
- `docs/superpowers/specs/2026-04-10-ai-procurement-artifact-delivery-closure-design.md`
- `docs/superpowers/specs/2026-04-07-platform-plugin-config-center-design.md`
- `docs/superpowers/specs/2026-04-11-config-center-operational-closure-design.md`

## v001-v012 演化总表

| 版本 | 北极星 | 为什么切到这一版 | 实际完成物 | blocker / 非目标 | 对下一步的影响 |
| --- | --- | --- | --- | --- | --- |
| `v001` | 建立开放源平台文档基线 | 项目刚启动，需要先有可追踪、可审阅的基础说明 | 初始目标文件与文档基线 | 不做产品代码 | 为后续把讨论沉淀进仓库打基础 |
| `v002` | 收口到北美 niche 内容、采集、分析、报告页与视频变现 | 用户确认第一阶段不只是搭架构，而是要面向真实内容机会 | 明确“采集 -> 证据 -> 分析 -> 内容 -> 变现”路线 | 不实现生产级采集系统 | 把项目方向从抽象平台拉到可变现内容链 |
| `v003` | 优先验证采集能力与开源工具兼容性 | 内容链成立后，底层要知道哪些工具真能用 | 采集工具兼容性验证目录、安装与冒烟记录 | 不把所有工具直接纳入主线 | 发现采集不是终点，只是证据链底层 |
| `v004` | 生成 AI procurement / direct API vs OpenRouter 的公开 SEO 决策 HTML 页面 | 需要证明采集内容能变成面向用户的决策页面，而不是采集过程日志 | `direct-api-vs-openrouter.html` 方向收口，强调 Quick Answer、决策树、风险边界 | 不做完整 Next.js 站，不重新线上采集 | 证明第一条“研究型页面”主线可落地 |
| `v005` | 切到平台级配置中心设计与计划 | 仅靠单案例页面不够，search、browser、crawler、secret 不能各自拼 env | 设计 `PluginType / PluginInstance / SecretRef / ProjectBinding / ResolvedRuntimeConfig`，冻结四批实现顺序 | 不直接写代码，不做 UI，不写真实 secret | 为平台化配置底座定边界 |
| `v006` | 打通 crawler 最小真执行闭环 | 配置中心只解析 adapter 不够，必须让 route 真进入执行路径 | `crawler-execution` 执行层，`yt-dlp` 与 `TikTokApi` 最小链路，失败 fallback 显式化 | 不扩 `twscrape / PRAW / MediaCrawler`，不解决风控 | 把 crawler 从配置对象推进到可执行 runtime |
| `v007` | 补齐真实环境 smoke 验证与运行文档 | 执行链路代码存在后，需要知道本机真实条件能不能跑 | smoke plan / runbook，`youtube / tiktok` 路线输入、命令、成功与失败判据 | 不做大规模回归，不解决验证码或长期会话 | 暴露真实阻塞点，为 diagnostics 做准备 |
| `v008` | 增加 runtime diagnostics、operator tooling、secret bootstrap | smoke 失败集中在外部依赖和 secret 材料层，不能继续靠异常字符串排障 | route-aware preflight / diagnostics、operator CLI、placeholder secret bootstrap | 不自动装 `yt-dlp`，不自动获取真实 cookie、账号、代理或 token | 形成 `external-blocked` 检查点：代码侧可诊断，真实收尾依赖外部材料 |
| `v009` | 补齐 AI procurement 正式 artifact delivery | 外部 smoke 暂时 blocked，但 AI procurement 交付物闭环可继续推进 | compile 成功时生成 file-backed `report.html`，`CompilationResult.artifacts` 指向 repo-relative 文件 | 不做通用 artifact 平台，不做 PDF/ZIP/serving API | 把“内存态报告壳”推进到正式交付物 |
| `v010` | 完成 platform plugin config center 的读路径、API 与 runtime 接入 | 外部 smoke 暂时无法继续，配置中心是可执行内部主线 | contracts/core、`control-api` 管理/校验/resolve API、`search-gateway`、browser runtime、crawler adapter 解析链路 | 不继续强推真实 smoke，不做 UI，不写真实 secret | 让平台拥有统一 config-center 读与 runtime resolution |
| `v011` | 收口 config-center 写路径 | `v010` 解决“能读和解析”，下一步缺“安全写入与恢复” | write contracts、record-aware loaders、atomic write、revision、lock、backup、`dryRun/apply`、operator runbook | 不做 secret value 写接口，不做 delete endpoint，不做任意文件写 | 配置中心从“只读/校验”升级为“安全预览、写入、恢复” |
| `v012` | 收口 config-center 运营化能力 | `v011` 已经能写，下一步缺 operator 可诊断、可验收、可回滚、可审计 | operator error contract、`project doctor`、backup history、runbook、acceptance checklist，已提交 `07078357` | 不做 UI，不接外部 vault，不扩 runtime 功能 | 配置中心进入“平台基础设施可运营”状态，下一步需要定义 `v013` |

## 四个阶段

### 阶段 1：文档与方向收口

覆盖版本：`v001-v003`

这一阶段主要解决“我们是不是要做平台、做什么方向、从哪里切入”。项目从早期架构与投资人说明，收口到北美 niche 内容、多源采集、证据沉淀、人工 + AI 分析和公开报告交付。

关键变化是：采集被明确为底层能力，而不是最终产品。

### 阶段 2：案例与内容闭环

覆盖版本：`v004` 与部分 `v009`

这一阶段尝试证明“用户问题 -> 研究判断 -> 页面交付”这条链路是有价值的。`AI procurement / direct API vs OpenRouter` 成为首个明确案例，后续 `v009` 又把它从内存态报告推进到 file-backed 正式 HTML artifact。

关键变化是：报告不再只是展示采集过程，而是要回答真实决策问题。

### 阶段 3：执行层与 runtime 补强

覆盖版本：`v005-v008`

这一阶段发现，只靠单案例无法长期运转，必须补执行层基础设施。于是项目开始围绕配置、crawler、smoke、diagnostics 这些“工程底座”推进。

关键变化是：项目从“会生成报告”推进到“知道怎样受控地获取证据、怎样诊断外部阻塞”。

### 阶段 4：配置中心平台化

覆盖版本：`v010-v012`

这一阶段连续收口 config-center：先能读、能解析、能接入 runtime，再能写、能回滚，最后能诊断、能审计、能验收。

关键变化是：配置中心不再是辅助模块，而成为平台控制面的核心基础设施。

## 当前项目状态

截至 2026-04-13，当前真实状态如下：

1. `v012` 已完成并推送，最新相关提交为 `07078357 feat(config-center): close v012 operational workflow`。
2. 当前激活目标仍是 `goal_v012_20260411.md`，所有里程碑均已完成。
3. 当前待办 `todo_v012_001_20260411.md` 显示下一步是定义 `v013`。
4. 当前工作区的未提交内容主要是 `.tmp/` 外部材料与新生成的 workbench 分析文档，没有新的产品代码主线正在施工。
5. `docs/sot/**` 仍是长期总纲，但更新时间早于 `v010-v012`，需要后续同步最新平台化事实。
6. `v008 external-blocked` 仍未完全收尾，真实 `youtube / tiktok` smoke 还依赖外部 `yt-dlp` 与真实 secret 材料。

## 当前最容易误判的点

### 误判 1：是不是一直在换方向

不是。表面看从内容、采集、crawler、artifact、config-center 来回切换，实际是在围绕同一件事补不同层：

`用户问题 -> 机会判断 -> 任务编译 -> 受控执行 -> 证据沉淀 -> 报告交付 -> 运营闭环`

### 误判 2：是不是在做爬虫平台

不是。爬虫只是执行层能力之一。项目更重要的是把采集结果变成可审计的证据，再变成可交付的研究资产。

### 误判 3：是不是在做内容站

也不是。公开页面是第一阶段最现实的变现交付形态，但平台的长期对象是 `Topic / TopicRun / SourceCapture / CollectionLog / Evidence / EvidenceSet / Artifact`。

### 误判 4：是不是应该马上做 UI

现在不应该。`v010-v012` 刚补完配置中心控制面底座，下一步更需要确认 `v013` 目标，而不是直接加 UI。

## 公允判断

当前项目已经过了“只有文档和想法”的阶段，也过了“只有单案例页面”的阶段。现在更准确的阶段是：

`平台底座已初步成型，但真实外部执行闭环仍未完全收口。`

其中，配置中心这条内部平台主线已经走得比较完整：

1. 能描述配置。
2. 能解析配置。
3. 能接入 runtime。
4. 能安全写入。
5. 能回滚。
6. 能诊断。
7. 能验收。

但外部真实世界这条线还没有完全闭环：

1. 真实 `yt-dlp` 条件未完全确认。
2. 真实 cookie / account / proxy / token 材料未完全提供。
3. `youtube / tiktok` 真机 smoke 仍是 external-blocked。
4. 更多 crawler adapter 仍未进入正式执行闭环。

## 下一步选择

### 选择 A：回到 external smoke 收尾

适用条件：

1. 能提供真实 secret、cookie、account、proxy 或 token。
2. 能提供或安装可用 `yt-dlp`。
3. 希望尽快证明 `youtube / tiktok` 真执行链路。

收益：

1. 直接补上当前最大外部 blocker。
2. 能回答“平台能不能真实采集”的问题。
3. 能决定下一批 adapter 是否值得扩展。

风险：

1. 依赖外部账号、风控和本机环境。
2. 可能耗时在非代码问题上。

### 选择 B：先做内部主线，但必须服务总北极星

适用条件：

1. 暂时仍拿不到真实 external 条件。
2. 不希望项目停在 blocked 状态。
3. 希望继续推进可验证的内部平台能力。

候选方向：

1. 同步 `docs/sot/**`，让长期真源反映 `v010-v012` 的真实进展。
2. 把 `OpportunitySpec -> TaskSpec -> WorkflowSpec -> ReportSpec` 的案例编译链再硬化一轮。
3. 对 AI procurement 正式 artifact 做 acceptance / replay / publish 边界补强。
4. 设计 `v013` 的最小内部主线，确保它不偏离“研究平台 + 公开报告交付”总目标。

风险：

1. 如果不设边界，容易继续堆内部能力，拖延真实外部验证。
2. 如果脱离案例，平台会变抽象。

## 推荐结论

如果现在仍不能提供真实 external 条件，推荐下一步先不写 runtime 代码，而是定义 `v013` 为：

`SoT synchronization and next-scope decision`

目标是把 `docs/sot/**`、`docs/workbench/**`、`Memory/**` 和已合并代码的真实状态对齐，然后明确下一条可执行主线。

这样做的价值是：

1. 不假装 external smoke 已经能完成。
2. 不继续无边界扩功能。
3. 先把项目“现在是什么、已完成什么、下一步为什么做”讲清楚。
4. 为后续继续真实 smoke 或继续内部主线提供统一口径。
