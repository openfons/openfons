# MiroFish 与 DeerFlow 深度对比及对 OpenFons 的借鉴建议

> 日期：2026-03-27
> 目的：对 `666ghj/MiroFish` 与 `bytedance/deer-flow` 做代码级阅读、Docker 级运行验证、成本结构分析，并与 OpenFons 当前规划做对照，判断哪些部分值得借鉴，哪些不应直接照搬。

## 1. 研究方法与证据来源

本次结论不是只看 README 得出的，而是基于三层证据：

1. 代码阅读
   - `MiroFish` 重点阅读了 `backend/app/api/*.py`、`backend/app/services/*.py`、`frontend/src/views/*.vue`、配置与启动文件。
   - `DeerFlow` 重点阅读了 `backend/docs/*.md`、`backend/packages/harness/deerflow/**`、模型适配器、技能加载器、子代理执行器、前端 API 客户端和 Docker 配置。
2. 本地运行验证
   - 两个仓库都已拉取到本地并通过 Docker 启动。
   - `MiroFish` 本地验证通过了前后端健康检查，并触发了真实的图谱生成入口。
   - `DeerFlow` 本地验证通过了网关、前端、LangGraph 控制面与实际 run 创建。
3. 官方价格页核对
   - `Zep`：`https://www.getzep.com/pricing/`
   - `Tavily`：`https://tavily.com/pricing`
   - 阿里云百炼模型列表与计费：`https://help.aliyun.com/zh/model-studio/models`

这意味着下面的判断同时覆盖了“它们怎么写的”“它们能不能跑起来”“它们跑起来之后卡在什么真实依赖上”“如果按默认路径使用，大概是什么成本结构”。

## 2. 先给结论

一句话判断：

- `MiroFish` 更像一个已经产品化包装过的垂直应用外壳，擅长把“输入材料 -> 结构化图谱 -> 模拟/推演 -> 报告/交互”讲成完整故事。
- `DeerFlow` 更像一个横向的 Agent 运行时底座，擅长把“模型接入、技能、子代理、记忆、网关、执行链路”组织成可扩展的系统。
- 对 OpenFons 来说，真正值得组合的方向不是二选一，而是：
  - 上游继续坚持我们自己的 `Intent Structuring -> Planning Swarm -> Opportunity Judge -> OpportunitySpec`
  - 中下游执行底座借鉴 `DeerFlow`
  - 面向交付和展示的体验借鉴 `MiroFish`

更直接一点说：

- `MiroFish` 值得学“外在产品表达”和“可视化交付方式”。
- `DeerFlow` 值得学“内部运行时组织方式”。
- OpenFons 最不能丢的是我们已经明确下来的“机会判断层”和“证据门禁层”。

## 3. MiroFish：它到底是什么

## 3.1 产品形态

从代码和页面结构看，`MiroFish` 的主叙事非常明确：

`用户上传材料/输入需求 -> 生成本体/图谱 -> 运行模拟 -> 生成报告 -> 继续交互`

前端页面已经按这个故事展开：

- `Home.vue`
- `Process.vue`
- `SimulationView.vue`
- `ReportView.vue`
- `InteractionView.vue`

这说明它不是“先有一套通用 Agent 底座，再随机拼出一个 Demo”，而是从一开始就在做一个强叙事的垂直产品。

## 3.2 架构形态

从后端结构看，`MiroFish` 是典型的垂直整合式产品：

- Flask 后端
- Vue 前端
- 图谱/本体构建服务
- 模拟管理与执行服务
- 报告生成服务
- 统一由前端流程串成一个用户可理解的长链路

关键实现文件能看出它的核心分层：

- `backend/app/api/graph.py`
- `backend/app/api/simulation.py`
- `backend/app/api/report.py`
- `backend/app/services/graph_builder.py`
- `backend/app/services/simulation_manager.py`
- `backend/app/services/simulation_runner.py`
- `backend/app/services/simulation_config_generator.py`
- `backend/app/services/report_agent.py`

这套结构的最大特点不是“通用”，而是“一个业务问题从输入到输出都被包在同一层叙事里”。

## 3.3 真正强的地方

`MiroFish` 最强的不是某个单点算法，而是以下几件事组合起来的产品感：

1. 输入到输出路径极其清晰
   - 用户很容易理解上传什么、系统做了什么、最后拿到什么。
2. 可视化交付感强
   - 图谱、模拟、报告、交互页让复杂系统有“看得见的过程”。
3. 适合做 Demo、展示、方案推介
   - 对外讲故事能力很强，比纯 API/Agent 框架更容易让投资人、客户、合作方理解。
4. 它天然鼓励“结果页”而不是“日志页”
   - 用户更像在消费一个分析产品，而不是在看后台控制台。

这一点对 OpenFons 很重要，因为我们未来也不是只想做一个“内部研究控制台”，而是要交付可发布、可传播、可反复消费的报告页和分析页。

## 3.4 真正弱的地方

如果从 OpenFons 角度看，`MiroFish` 的问题也同样明显：

1. 它不是一个好的通用执行底座
   - 它更偏“一个已经定了业务流程的产品”，而不是“一个适合我们扩展任意任务编译链的 runtime”。
2. 上游机会判断层明显不完整
   - 它更适合处理“主题已经被确认”后的分析、图谱化、模拟和报告。
   - 它没有 OpenFons 当前最看重的 `OpportunitySpec` 前置门禁能力。
3. 代码耦合度较高
   - 前端叙事、后端服务和业务流程绑定很强，适合产品闭环，不适合作为我们核心底座直接继承。
4. 默认依赖成本链条偏重
   - 图谱、模拟、多轮报告天然意味着 token 与外部服务消耗都容易被放大。
5. 许可证有明显边界
   - 仓库许可证为 `AGPL-3.0`，这对未来商用闭源边界、源码引用方式、部署模式都需要更谨慎。

## 3.5 本地运行验证说明了什么

本地 Docker 运行后，`MiroFish` 已验证：

- `http://localhost:3000` 返回 `200`
- `http://localhost:5001/health` 返回 `200`

进一步对真实入口做了最小调用，向 `POST /api/graph/ontology/generate` 提交了临时文本文件，结果不是假接口报错，而是打到了真实的 DashScope 兼容调用链，返回：

- `401 invalid_api_key`

这件事很关键，因为它证明了三点：

1. 它的前后端壳子不是假的，能正常启动。
2. 真实业务链路已经连到外部模型服务。
3. 第一层真实阻塞不是代码不能跑，而是必须有正确的模型凭证。

也就是说，`MiroFish` 是“真的产品链路”，不是只会展示静态页面的样板仓库。

## 3.6 成本结构判断

如果按它默认叙事使用，`MiroFish` 的成本不是一个单纯的“每次问答多少 token”，而是复合成本：

1. LLM 推理成本
   - 本体抽取
   - 图谱生成
   - 模拟配置生成
   - 多轮模拟
   - 报告生成
2. 图谱/记忆成本
   - README 与代码默认路径里有 `Zep` 这一类图谱/记忆依赖
3. 可能的外部搜索或增强成本
   - 若启用额外搜索或知识增强，会进一步叠加

按本次官网核对，可引用的外部价格锚点是：

| 项目 | 官方价格信号 | 对 MiroFish 的含义 |
| --- | --- | --- |
| Zep | Free：每月 `1,000 credits`；Flex：`$25/月` 含 `20,000 credits`，超出后 `每 20,000 credits 再 $25`；Flex Plus：`$475/月` 含 `300,000 credits`，超出后 `每 100,000 credits 再 $125` | 若把图谱/记忆作为默认生产依赖，成本会跟“写入 Episode 数量和体积”绑定 |
| Qwen3.5-Plus（阿里云百炼，中国内地/全球） | 输入 `0.8 元 / 百万 token`，输出 `4.8 元 / 百万 token` | 单次推理不贵，但多阶段、多轮模拟会把总 token 放大 |
| Qwen3.5-Plus（国际） | 输入 `2.936 元 / 百万 token`，输出 `17.614 元 / 百万 token` | 如果未来面向海外部署，同样的流程成本会明显抬高 |

所以我对 `MiroFish` 的成本感受是：

- 单次 Demo 成本可控
- 连续多轮真实业务使用时，成本敏感点会从“模型单价”转向“流程深度 × 回合数 × 图谱写入量”
- 这更像“中高交付价值产品”的成本曲线，而不是“轻量任务编排器”的成本曲线

## 4. DeerFlow：它到底是什么

## 4.1 产品形态

`DeerFlow` 和 `MiroFish` 的区别非常大。

它不是把某一个垂直业务讲成完整用户故事，而是在做一个更通用的 Agent 运行时平台，核心关注点是：

- 模型路由
- gateway
- LangGraph 编排
- skills
- tools
- subagents
- memory
- provider 适配
- 前端控制面

它更像“让各种 Agent 能组织起来”的基础设施，而不是“告诉用户上传一份资料后会得到什么报告”的成品应用。

## 4.2 架构形态

本次阅读到的关键文件非常能说明问题：

- `backend/docs/ARCHITECTURE.md`
- `backend/docs/API.md`
- `backend/docs/CONFIGURATION.md`
- `backend/packages/harness/deerflow/agents/lead_agent/agent.py`
- `backend/packages/harness/deerflow/agents/lead_agent/prompt.py`
- `backend/packages/harness/deerflow/tools/tools.py`
- `backend/packages/harness/deerflow/tools/builtins/task_tool.py`
- `backend/packages/harness/deerflow/subagents/executor.py`
- `backend/packages/harness/deerflow/skills/loader.py`
- `backend/packages/harness/deerflow/agents/memory/prompt.py`
- `backend/packages/harness/deerflow/models/openai_codex_provider.py`
- `backend/packages/harness/deerflow/models/credential_loader.py`

从这些文件能看出，`DeerFlow` 的系统边界更接近：

`前端控制面 -> API/gateway -> LangGraph/harness -> model provider + skills + tools + memory + subagents`

这是非常典型的“横向 runtime + provider abstraction + execution harness”思路。

## 4.3 真正强的地方

如果站在 OpenFons 当前架构方向上看，`DeerFlow` 的价值非常高：

1. 它更接近“运行时底座”而不是“单一产品外壳”
   - 更适合被拆解、复用、抽象。
2. 技能与工具系统比较成型
   - 对 OpenFons 未来的 `skills`、`workers`、`task compiler` 很有参考价值。
3. 子代理执行器很重要
   - 这对我们未来的规划型 Agent、收集型 Worker、评估型 Worker 分工很有启发。
4. 网关与 provider 适配是明确层
   - 这和我们要做的模型采购、路由、地区与成本策略天然同频。
5. LangGraph/harness 的组织方式可借鉴
   - 它证明了“多 Agent 运行时”可以被做成结构化产品，而不是全靠 prompt 拼接。

## 4.4 真正弱的地方

但它并不等于 OpenFons，差距同样明显：

1. 它没有 OpenFons 特有的“机会判断层”
   - 没有我们已经明确的 `Intent Structuring -> Planning Swarm -> Opportunity Judge -> OpportunitySpec`。
2. 它没有“证据门禁优先于生成”的强约束
   - 更像一个通用 Agent 平台，而不是证据优先的研究与发布系统。
3. 它的 SoT 更偏 runtime，而不是 research artifact
   - OpenFons 未来更需要 `Source Registry / Evidence / EvidenceSet / ReportSpec` 作为长期真源。
4. provider 接入仍然会踩真实工程坑
   - 本地实跑已经证明确实存在配置与认证形状不兼容的问题。
5. 它更适合做“执行层”，不适合直接充当“业务判断层”

## 4.5 本地运行验证说明了什么

本地 Docker 运行后，`DeerFlow` 已验证：

- `http://localhost:2026` 返回 `200`
- `http://localhost:2026/api/models` 返回 `200`
- `http://localhost:2026/api/skills` 返回 `200`
- `http://localhost:2026/api/memory` 返回 `200`

进一步的真实验证不是停在健康检查，而是：

1. 成功创建 LangGraph thread
2. 实际对 `/api/langgraph/.../runs/stream` 发起 run
3. 指定 `assistant_id: "lead_agent"`
4. 运行被真正接收并开始执行 `lead_agent`
5. 随后在 `CodexChatModel` 初始化处失败

失败原因不是服务没启动，而是 provider 认证不兼容：

- 容器内存在 `/root/.codex/auth.json`
- 但当前文件只包含：
  - `auth_mode`
  - `OPENAI_API_KEY`
- `credential_loader.py` 期望的字段则是：
  - `access_token`
  - `token`
  - 或 `tokens.access_token`

这说明：

1. `DeerFlow` 的控制面、网关、LangGraph 编排是真能跑起来的。
2. 真正的失败发生在“模型 provider 适配层”。
3. 它暴露出了一个很真实的工程教训：
   - 多模型、多供应商、多认证方式系统，最容易出问题的往往不是 Agent prompt，而是 provider adapter 与 credential contract。

这对 OpenFons 非常有借鉴意义。

## 4.6 成本结构判断

`DeerFlow` 本身不是一个固定成本产品，成本高度取决于你给它配什么模型、搜索、记忆和工具。

从这次验证路径看，它的成本主要来自四层：

1. 主模型成本
   - 例如 OpenAI / Codex / 其他 provider
2. 搜索增强成本
   - 默认生态里常见的是 Tavily 一类搜索服务
3. 记忆/上下文工程成本
   - 可以是外部服务，也可以是自建
4. 子代理并发放大成本
   - 一旦一个任务被拆成多个 subagents，总 token 与外部调用会放大

本次官网核对里，对 DeerFlow 默认生态最有意义的价格锚点是：

| 项目 | 官方价格信号 | 对 DeerFlow 的含义 |
| --- | --- | --- |
| Tavily | Free/Researcher：每月 `1,000 API credits`；Pay As You Go：`$0.008 / credit`；Project：`$30/月` 含 `4,000 API credits` | 如果把搜索增强作为默认能力，成本是稳定可预估的，但会随任务量线性增长 |
| 主模型 | 由实际 provider 决定 | DeerFlow 是成本放大器，不是成本本体；真正大头仍然是你选择的模型 |

所以我对 `DeerFlow` 的成本感受是：

- 底座本身并不贵，关键看你如何配置 provider
- 比 `MiroFish` 更容易做出“按需启用”的成本控制
- 但如果不加门禁，subagent、search、memory 叠加后仍会快速膨胀

## 5. MiroFish 与 DeerFlow 的本质差异

| 维度 | MiroFish | DeerFlow |
| --- | --- | --- |
| 核心定位 | 垂直产品壳 | 横向 Agent runtime |
| 主叙事 | 输入材料后产出图谱/模拟/报告 | 组织模型、技能、工具与子代理 |
| 用户可见性 | 很强，适合展示与交付 | 中等，更偏控制面与系统层 |
| 代码耦合方式 | 业务流程强耦合 | 运行时模块化更强 |
| 对 OpenFons 的价值 | 借鉴交付体验与产品包装 | 借鉴执行底座与运行时分层 |
| 上游机会判断能力 | 弱 | 弱 |
| 下游执行组织能力 | 中 | 强 |
| 许可证 | `AGPL-3.0` | `MIT` |
| 直接引用代码风险 | 高 | 低 |

所以如果用一句更工程化的话来概括：

- `MiroFish` 是“结果导向的垂直交付系统”
- `DeerFlow` 是“过程导向的横向执行系统”

## 6. 对照 OpenFons 当前计划：哪些是同频的，哪些不是

OpenFons 当前已经明确的主链路是：

`User Input -> Intent Structuring -> Planning Swarm -> Opportunity Judge -> OpportunitySpec -> User Confirmation -> TaskSpec / WorkflowSpec -> Controlled Collection -> EvidenceSet -> ReportSpec -> Next.js`

这个链路与两个仓库的关系如下。

## 6.1 和 MiroFish 的关系

相似处：

1. 都重视“过程可视化”和“最终报告交付”
2. 都不是只想做 CLI
3. 都适合被包装成对外可讲清楚的产品

不同处：

1. `MiroFish` 更像“主题已经确定以后”的后半段产品
2. OpenFons 更重视“在开始采集和生成之前，先判断这个机会值不值得做”
3. OpenFons 要把 `EvidenceSet` 和 `ReportSpec` 做成可审核、可回放、可复用真源
4. `MiroFish` 的模拟逻辑不是我们的 v1 主线

所以它更像 OpenFons 的“下游展示与交付灵感”，不是“上游控制面模板”。

## 6.2 和 DeerFlow 的关系

相似处：

1. 都认可 skill / tool / agent / subagent 的运行时拆分价值
2. 都需要 provider 路由与模型适配
3. 都需要多阶段任务执行

不同处：

1. `DeerFlow` 没有把 `OpportunitySpec` 作为唯一前置真源
2. `DeerFlow` 更像 Agent 运行时，不像研究发布系统
3. OpenFons 对 source weighting、evidence gating、report contract 的要求更强
4. OpenFons 的 SoT 不应落在 memory 或 thread 上，而应落在 `contracts + evidence artifacts` 上

所以它更像 OpenFons 的“执行平面参考”，不是“控制平面真源”。

## 7. 哪些值得借，哪些不要借

## 7.1 从 MiroFish 值得借的

1. 强叙事的页面链路
   - `输入 -> 处理中 -> 图谱/过程 -> 报告 -> 继续探索`
2. 面向外部展示的产品包装
   - README、截图、Demo、输出物导向表达
3. 交付页而不是日志页
   - 对 OpenFons 的 `report-web` 很有启发
4. 可视化过程对象
   - 例如图谱、阶段时间线、结论卡片、互动视图

## 7.2 从 MiroFish 不该直接借的

1. 不要照搬其业务主线
   - 它的主线是“已知主题后的分析与模拟”，不是“机会判断优先”。
2. 不要把模拟世界当作 OpenFons v1 核心
   - 我们 v1 更该优先落在 `OpportunitySpec -> EvidenceSet -> ReportSpec`。
3. 不要直接复用 AGPL 代码进入主线闭源/商用边界不清的区域

## 7.3 从 DeerFlow 值得借的

1. harness 思维
   - 把模型、工具、技能、子代理放进一个明确的执行壳里。
2. provider abstraction
   - 未来 OpenFons 必须支持模型采购、地区与成本策略，这一点非常重要。
3. subagent executor
   - 很适合我们未来的规划 agent、研究 worker、评估 worker 分工。
4. gateway 与 runtime 分离
   - 有利于控制平面和执行平面拆层。
5. skills loader / tools registry 组织方式
   - 对 `packages/skills`、`adapters`、`policy-engine` 的落地很有帮助。

## 7.4 从 DeerFlow 不该直接借的

1. 不要把 thread/memory 当作主真源
2. 不要让一个通用 lead agent 吞掉所有业务判断
3. 不要跳过 `OpportunitySpec` 就直接进入 agent execution
4. 不要接受 provider credential contract 模糊不清
   - 本次实跑已经证明这会直接阻塞系统可用性

## 8. 对 OpenFons 的推荐融合架构

如果把两者优点组合到 OpenFons，我更推荐下面这个方向：

## 8.1 控制平面保持 OpenFons 自己的设计

坚持：

`Intent Structuring -> Planning Swarm -> Opportunity Judge -> OpportunitySpec -> User Confirmation`

这是 OpenFons 和普通 Agent runtime 最大的差异化价值，不应该被弱化。

## 8.2 执行平面借 DeerFlow 的组织方式

可以借鉴 DeerFlow 的方式去做：

- runtime harness
- model adapter
- tools registry
- skills loader
- subagent executor
- gateway

但输入必须来自我们自己的：

- `OpportunitySpec`
- `TaskSpec`
- `WorkflowSpec`

也就是说，执行平面要“像 DeerFlow”，输入契约要“像 OpenFons”。

## 8.3 数据与交付平面借 MiroFish 的呈现方式

`report-web` 不要只做成后台管理页，应该更接近：

- 强阶段感
- 强证据感
- 强可视化感
- 强摘要与结论感

可以吸收 `MiroFish` 那种：

- 让用户看见过程
- 让用户感到系统真的做了复杂工作
- 让输出物像一个产品，而不是像一堆日志

## 8.4 模拟/世界模型作为可选下游模块

如果未来 OpenFons 真的要走到“主题推演、竞争格局模拟、角色互动预测”一类能力，可以把这类能力作为：

- `post-evidence optional module`
- `advanced analysis module`

而不是放到 v1 主链路上。

这样做可以避免我们被 `MiroFish` 的产品张力吸引后，过早把系统重心放错位置。

## 9. 成本与工程含义：对 OpenFons 的直接启发

这次研究最值得吸收的，不只是功能，而是三条现实工程结论。

## 9.1 运行时不是难点，provider contract 才是

`DeerFlow` 能跑起来，但卡在认证文件形状不兼容。

这说明 OpenFons 后续一定要把以下内容前置成显式契约：

- provider credential schema
- auth source precedence
- regional endpoint policy
- billing metadata
- feature availability by provider

否则模型采购和路由体系会成为“纸上方案”。

## 9.2 产品叙事不是装饰，而是交付能力的一部分

`MiroFish` 给人的启发是：复杂系统如果不被讲成一条清晰故事链，外界很难理解价值。

对 OpenFons 而言，这意味着：

- `report-web` 不是锦上添花
- 页面级体验本身就是产品竞争力
- 同样的分析，如果页面呈现不够强，外部感知价值会大幅下降

## 9.3 成本控制必须通过“门禁”完成，而不是事后统计

无论是 `MiroFish` 的多轮分析，还是 `DeerFlow` 的子代理/搜索/记忆，都说明：

- 一旦流程真正跑起来，成本会自然膨胀
- 事后做账单分析已经太晚

对 OpenFons 更合理的方式是：

1. 先做 `Opportunity Judge`
2. 再做 `evidence feasibility`
3. 再做 `execution budget`
4. 最后才放行执行

这和我们当前规划是高度一致的，应该继续坚持。

## 10. 近期可执行建议

结合这次研究，我建议 OpenFons 接下来按下面顺序推进。

## 10.1 先定义执行平面契约，不急着抄 runtime

优先明确：

- `TaskSpec`
- `WorkflowSpec`
- `ExecutionBudget`
- `ProviderPolicy`
- `EvidenceRequirements`

然后再吸收 DeerFlow 式的 runtime 组织。

## 10.2 单独做一个 DeerFlow 风格的最小 harness POC

建议范围控制在：

- 一个 lead runtime
- 一个 model adapter interface
- 一个 skill loader
- 一个 subtask executor
- 一个 provider config schema

目标不是立刻替代全部执行层，而是验证 OpenFons 契约能否驱动 DeerFlow 风格 runtime。

## 10.3 提前设计 report-web 的叙事结构

建议从 MiroFish 借鉴以下页面体验：

- 阶段时间线
- 证据卡片
- 结论卡片
- 可展开的过程视图
- 互动式下一步建议

但数据必须来自 `EvidenceSet` 和 `ReportSpec`，不能反过来让页面决定事实。

## 10.4 把 provider 兼容性当作一级工程对象

这次 DeerFlow 的实跑已经说明，provider 层最容易变成隐性爆点。

建议 OpenFons 尽早固定：

- auth file schema
- env var schema
- provider capability matrix
- geo / pricing / rate-limit metadata

这部分实际上和我们已有的“模型采购、路由、地区选择”规划是同一件事。

## 10.5 模拟能力不要抢 v1 主线

如果后续想引入更“炫”的角色模拟、市场推演、世界建模能力，建议挂在：

- `advanced analysis`
- `scenario lab`
- `optional premium workflow`

而不是放到最小可用主链里。

## 11. 最终建议

如果要把两者的借鉴关系压缩成一句执行建议，我的结论是：

**OpenFons 应该用 DeerFlow 的方式组织执行，用 MiroFish 的方式包装交付，但绝不能放弃自己已经明确的 Opportunity/Evidence 控制层。**

更具体地说：

1. 主架构不要变
   - 继续坚持 `OpportunitySpec` 是前置真源。
2. 执行底座可向 DeerFlow 学习
   - 特别是 harness、skills、subagents、provider adapter。
3. 展示和交付向 MiroFish 学习
   - 特别是页面叙事、过程可视化和报告感。
4. 许可证边界要清楚
   - `MiroFish` 的 `AGPL-3.0` 只适合做参考，不适合轻率混入主线代码。
   - `DeerFlow` 的 `MIT` 对架构借鉴和局部复用更友好。

如果只允许我给一个优先级建议，那就是：

- 第一优先级借 `DeerFlow`
- 第二优先级学 `MiroFish`
- 零优先级是继续守住 OpenFons 自己的 `OpportunitySpec -> EvidenceSet -> ReportSpec` 主链

## 12. 附：本次研究中最重要的实际验证结论

### 12.1 MiroFish

- 已本地启动成功
- 前端 `3000`、后端健康检查 `5001/health` 均返回正常
- 真实图谱入口已打到外部模型服务
- 当前阻塞点是模型 API Key，不是本地架构失效

### 12.2 DeerFlow

- 已本地启动成功
- 前端和 gateway 均可访问
- `models / skills / memory` API 均返回正常
- LangGraph run 已可创建并启动 `lead_agent`
- 当前阻塞点是 Codex provider 的认证字段不兼容，不是控制面不可用

### 12.3 对 OpenFons 的共同启发

- 这两个项目都已经证明：成熟系统的关键不只是 prompt，而是契约、运行时、依赖、凭证与交付形态。
- OpenFons 要做的不是“再造一个通用 Agent 框架”，而是把机会判断、证据采集、报告交付这条链真正做成可运行、可控、可商用的系统。
