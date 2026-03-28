# AI 编程与 Agent 时代模型采购、路由、成本与地区选择系统案例

> 项目名：OpenFons
> 文档定位：`docs/plan2` 的案例型规划文档
> 文档目的：把“用户一句自然语言问题 -> 意图结构化 -> 流量判断 -> 选题机会图 -> 多源采集 -> EvidenceSet -> Next.js 投行式报告页”落成一份可执行样例
> 案例日期：2026-03-26

## 1. 用户输入

本案例假设用户输入如下：

> 现在是 AI 编程、agent 时代，tokens 消耗巨大，用户需要一个既聪明、还便宜的模型供应商。到底应该买哪一家，还是多家一起买，还是通过中转？能不能调研全球大模型价格对比，也比较一些知名第三方中转，并考虑多语言和不同国家的结构？

这个输入背后的真实需求，通常不是“看一个静态价格表”，而是：

1. 我到底该怎么买模型。
2. 我应该直连一家、直连多家，还是通过路由 / 中转。
3. 我在自己的国家、语言、预算和工具栈下，哪种方案最划算。
4. 这件事能不能整理成长期有搜索流量、还能持续更新的权威页面。

## 2. 公允判断

### 2.1 这个主题能不能做成长线流量站

结论：**能做，而且从商业意图上看，很可能比单一开源项目的部署教程更强。**

原因有五点：

1. 这是持续性需求，不是一次性热点。
   模型价格、供应商、路由策略、缓存、工具调用和区域可用性会不断变化。
2. 这是强决策需求，不只是信息浏览。
   用户看这类内容，往往是为了采购、降本、迁移、切换或配置工作流。
3. 这是多角色需求。
   个人开发者、小团队、AI 产品经理、采购和技术负责人都可能搜。
4. 这是天然适合“比较页 + 决策页 + 更新页”的站型。
5. 这是能直接连接商业化的主题。
   广告、affiliate、咨询、代选型、代接入、预算规划、采购清单都能接。

### 2.2 但不应该把它做成“全球前 20 大模型静态价目表”

结论：**如果只是静态价格表，长期价值不够。**

更准确的产品形态应该是：

`AI coding / agent procurement intelligence site`

也就是“模型采购与路由决策站”，而不是“模型价格抄表站”。

静态价目表的问题有六个：

1. 很容易过时。
2. 很容易被官方页面替代。
3. 很难形成差异化观点。
4. 不回答真正的采购问题。
5. 不包含隐藏成本。
6. 不适合作为长期 SEO 资产沉淀。

真正值得做的是下面这些问题：

1. 对 AI coding 场景，哪类模型最便宜且够用。
2. 直连官方 API 和走中转 / 路由，什么时候各自更优。
3. 单供应商和多供应商架构的成本与风险差异。
4. 不同国家、币种、发票、网络和合规条件下，采购路径如何变化。
5. 模型价格之外，工具调用、缓存、搜索、沙盒、重试、失败回退、上下文长度对总成本的影响有多大。

### 2.3 你更需要的是不是一个 agent 来结构化用户输入

结论：**是，但不能把它理解成“一个万能 agent”。**

对外看，它可以表现为一个前端智能助手；
对内看，它更应该是一条受控的前置编译链。

更准确的形态应该是：

`用户输入 -> Intent Structuring -> Planning Swarm -> Opportunity Judge -> OpportunitySpec -> 用户确认 -> Task Compiler -> Worker`

也就是说，真正优先级最高的不是“会搜索的 agent”，而是：

`把用户一句模糊问题编译成稳定中间态的 agent`

如果缺少这层，中后段再强也会出问题：

1. 搜索会跑偏。
2. 采集会浪费。
3. 页面标题会变成拍脑袋。
4. 很容易做成“看起来很多，实际上没有流量价值”的内容。
5. 用户确认点不清晰，导致返工。

### 2.4 公允的结构判断

你们现在最该优先建设的，不是一个“全能采集 agent”，而是一个：

`Intent-to-Opportunity Agent`

这个 agent 的职责不是给最终答案，而是把用户原始问题变成：

1. 明确的任务意图。
2. 明确的受众。
3. 候选市场和语言。
4. 候选搜索意图。
5. 候选关键词簇。
6. 候选页面角度。
7. 是否值得进入公开 SEO 流程的判断。

所以，**“先结构化用户需求，再判断值不值得采，再去采，再生成报告页”这个思路是对的，而且应该作为系统门禁。**

## 3. 这条产品链应该长什么样

建议固定成下面这条链：

`用户输入 -> Intent Structuring -> Planning Swarm -> Opportunity Judge -> OpportunitySpec -> 用户确认 -> TaskSpec -> WorkflowSpec -> 受控采集 -> EvidenceSet -> AnalysisBrief -> Human Review -> ReportSpec -> Next.js Renderer`

这里最关键的是，前端 LLM 不应直接输出文章，而应输出稳定中间态。

### 3.1 为什么这条链更合理

1. 用户原话不是最终标题，也不是最终关键词。
2. 流量机会需要先验证，而不是先写内容。
3. 采集任务必须被结构化后才能受控执行。
4. 页面“权威感”来自证据链、更新时间和引用，不来自模型语气。
5. 发布后的真实判断必须回到 Search Console 和用户行为。

### 3.2 最前面的 agent 应该产出什么

最佳实践不是“对下游并列抛出 4 份契约”，而是：

`Planning Swarm 内部多对象分析 -> Opportunity Judge 收口 -> 对下游输出唯一的 OpportunitySpec`

也就是说，前置规划层内部可以保留 4 个分析子对象：

1. `IntentSpec`
   用户到底在问什么。
2. `DemandResearchBrief`
   这个题值不值得做成公开页面。
3. `OpportunityMap`
   适合做成哪些页面方向。
4. `ApprovalPayload`
   给用户确认用的可选方向与执行成本说明。

但对 `Task Compiler`、调度层、审计回放和 UI 来说，更稳妥的外部接口应该只有一个：

5. `OpportunitySpec`
   由 `Opportunity Judge` 汇总上面 4 类信息后输出，作为后续 `TaskSpec / WorkflowSpec / ReportSpec` 的唯一输入契约。

推荐把 `OpportunitySpec` 设计成下面这些子对象：

1. `intent`
2. `demandResearch`
3. `opportunityOptions`
4. `approval`
5. `recommendedOpportunity`

### 3.3 这是不是最佳实践

结论：**对你们当前阶段，这很可能是最稳的 `v1` 最佳实践，但不应被写成不可变终局。**

更准确地说：

1. 它优于“用户一句话直接交给单个 ReportAgent 去搜再写”。
2. 它也优于“一开始就做一个自由讨论、无限扩张的多 Agent 黑盒”。
3. 它的价值不在于 agent 数量，而在于把“机会判断”和“后续采集生成”分层。

所以当前最合理的判断不是：

`这 4 个角色永远最优`

而是：

`这 4 个角色是当前最小合理拆分，足以把机会判断层跑起来，并支持后续复盘`

### 3.4 为什么当前先用这 4 个角色

之所以先用这 4 个，是因为它们刚好覆盖了你们最关键的 4 类失败风险：

1. `Intent Clarifier`
   防止用户原话被误读。
2. `Demand Analyst`
   防止把低需求题错当机会。
3. `Competition Analyst`
   防止选了需求存在但几乎没有可切口的题。
4. `Monetization Analyst`
   防止做出有流量却没有商业化价值的页面。

最后再让：

5. `Opportunity Judge`
   把前面 4 种判断收口成唯一的 `OpportunitySpec`。

### 3.4.1 最佳实践：角色层不替代步骤层

这里要明确区分 3 层：

1. `角色层`
   回答“谁负责判断”，例如 `Intent Clarifier`、`Demand Analyst`、`Competition Analyst`、`Monetization Analyst`、`Opportunity Judge`。
2. `步骤层`
   回答“流程怎么跑”，例如 `structure_intent`、`run_demand_analysis`、`run_competition_analysis`、`run_monetization_analysis`、`judge_opportunity`、`confirm_user_scope`。
3. `契约层`
   回答“最后交给下游的结构化结果是什么”，例如 `OpportunitySpec`、`TaskSpec`、`WorkflowSpec`、`ReportSpec`。

因此，`clarify_intent`、`demand_research` 这类名字如果继续保留，只应作为 planning workflow 内部步骤或遥测标签，不应与 `Intent Clarifier`、`Demand Analyst` 混作同一层概念。

这套拆分的好处是：

1. 每个角色足够独立。
2. 每个角色都能被单独评估。
3. 后续可以根据案例数据决定是否合并或扩展。

### 3.5 什么时候应该调整这 4 个角色

如果后续真实案例里持续出现下面这些信号，就说明角色拆分要调整：

1. 两个角色长期输出高度重复。
2. 某一个角色长期没有提供独立增量。
3. 某一类判断总是缺位。
   例如地区、语言、本地支付、法规、内容差距。
4. 单次规划延迟和成本过高。
5. 角色之间频繁冲突，但 `Opportunity Judge` 仍无法稳定收敛。

这时可以：

1. 合并角色。
2. 拆分角色。
3. 增加新角色。
   例如 `Geo/Localization Analyst`、`Content Gap Analyst`、`Freshness Analyst`。

### 3.6 先搭建还是先继续抽象讨论

结论：**先按这版搭起来，再用真实案例优化，比继续空转争论更合理。**

原因有三点：

1. 这类系统的好坏，不可能只靠纸面讨论证明。
2. 真正决定角色是否合理的是案例命中率，而不是概念完整度。
3. 你们当前阶段更需要“可运行的 `v1`”，而不是“理论上最复杂的终局图”。

因此更推荐的实施策略是：

1. 先按 `Intent Structuring -> Planning Swarm -> Opportunity Judge -> OpportunitySpec` 落一个 `v1`。
2. 先拿 10 到 20 个真实用户问题做回放。
3. 记录每个角色是否真正提供了独立价值。
4. 再决定是否合并、拆分或新增角色。

## 4. 为什么这个主题值得做，但也更难做

这个主题比一般教程页更有商业价值，但它有更高的方法论要求。

### 4.1 难点不在“搜不到”，而在“无法直接横比”

模型采购和路由类内容天然有这些比较难题：

1. 价格口径不统一。
   有的按 input / output token，有的按 cached token，有的按 search/tool call，有的按容器或 session，有的按小时。
2. 产品层级不统一。
   有的是模型供应商，有的是聚合路由商，有的是云平台代理层。
3. 地区条件不统一。
   可用国家、发票、支付方式、访问稳定性、合规边界都不同。
4. 真实成本不只来自 token 单价。
   Prompt caching、失败重试、工具调用、超长上下文、搜索增强、代码执行、带宽和团队治理都会影响总成本。
5. 搜索意图并不等于“lowest price”。
   很多人真正想搜的是“够便宜但别太笨”“适合 coding agent 的低成本方案”“团队应该怎么组合购买”。

### 4.2 所以真正有价值的不是“价格事实”，而是“采购判断”

你们的网站长期价值应该来自：

1. 标准化价格模型。
2. 统一对比口径。
3. 场景化采购建议。
4. 地区化选择建议。
5. 更新日志。
6. 证据来源和引用链。

## 5. 前端 LLM 应该如何理解这类用户问题

### 5.1 不要把用户原话直接当页面标题

用户原话只是 `keywordSeed`。

例如：

- 用户原话：`大模型价格对比`
- 错误做法：直接生成一页《全球大模型价格对比》
- 正确做法：先判断更适合切在哪个搜索意图上

更具体的落地方向可能是：

1. `best cheap model for coding agents`
2. `direct API vs OpenRouter for AI coding`
3. `best LLM stack for small AI teams`
4. `hidden costs of AI coding models`
5. `best AI model provider by country`

### 5.2 推荐的系统澄清话术

如果用户只给一句：

`全球大模型价格对比`

系统更合理的回复不应直接进入采集，而应类似这样：

> 我理解你不是只想看一张静态价格表，而是想知道在 AI coding / agent 场景下，哪些模型和购买方式在不同预算、国家和语言环境里更值得选。如果你没有先限定市场，我会先比较英文市场和你指定市场的需求信号，再把主题拆成直连官方、多家直连、第三方路由、低成本 coding model、多语言支持、国家地区差异等几个方向，让你确认后再进入采集和报告生成。

### 5.3 推荐的 OpportunitySpec 输出格式

```json
{
  "opportunitySpecVersion": "v1",
  "seed": "全球大模型价格对比",
  "topic": "AI coding and agent model procurement",
  "intent": {
    "intentCandidates": [
      "pricing_comparison",
      "procurement_decision",
      "routing_decision",
      "country_selection",
      "cost_optimization"
    ],
    "audienceCandidates": [
      "solo developers",
      "small AI teams",
      "technical buyers",
      "engineering managers"
    ],
    "geoCandidates": [
      "US",
      "EU",
      "IN",
      "JP",
      "BR",
      "CN"
    ],
    "languageCandidates": [
      "en",
      "zh-CN",
      "ja",
      "pt-BR",
      "es"
    ]
  },
  "demandResearch": {
    "geoResolution": "pending_validation",
    "languageResolution": "pending_validation",
    "signalFamilies": [
      "search",
      "community",
      "commercial",
      "content",
      "update"
    ],
    "status": "draft_pending_research"
  },
  "opportunityOptions": [
    {
      "keyword": "best cheap model for coding agents",
      "angle": "low-cost but still usable model stack for coding agents"
    },
    {
      "keyword": "direct API vs OpenRouter",
      "angle": "official direct purchase versus routing platform tradeoff"
    },
    {
      "keyword": "best LLM stack for small AI teams",
      "angle": "single versus multi-provider procurement path"
    },
    {
      "keyword": "hidden costs of AI coding models",
      "angle": "total-cost-of-ownership instead of token-only comparison"
    },
    {
      "keyword": "best AI model provider by country",
      "angle": "market and localization differences in procurement"
    }
  ],
  "approval": {
    "status": "pending_user_confirmation",
    "nextAction": "user_confirmation"
  },
  "recommendedOpportunity": {
    "primaryKeyword": "best cheap model for coding agents",
    "angle": "build a decision page for cost-sensitive coding teams",
    "status": "pending_user_confirmation"
  }
}
```

## 6. 这个主题的 10 个流量方向

> 2026-03-28 实验治理说明：本节的候选方向、`P0/P1` 优先级和关键词建议仅保留为历史探索性的 `planning hypothesis / pending validation`，不再作为当前执行实验的直接排名结果。当前实验流程必须先过 `Authority / Distribution / Compliance / Maintenance Cost` 四个 hard gates，只有通过 hard gates 的方向才可进入后续次级排序与 winner 选择。

下面这 10 个方向不是都要立刻上线，而是“候选页面池”。

这里的方向、优先级和关键词都只是：

`planning hypothesis / pending validation`

它们必须在真正进入发布排期前，再经过 demand research、SERP 观察、证据可得性评估和商业化路径评估。

| 编号 | 方向 | 主关键词建议 | 页面角度 | 为什么值得做 | 商业潜力 | 当前优先级 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 采购方案总对比 | `AI coding model procurement options` | 主流采购路径与购买方式总览 | 适合作为 pillar page | 高 | P0 |
| 2 | 便宜但够用的 coding model | `best cheap model for coding agents` | 低成本但可用于 agent / coding 的模型选择 | 强决策意图 | 高 | P0 |
| 3 | 直连 vs 中转 | `direct API vs OpenRouter` | 官方 API 与路由商如何选 | 高争议、高转化 | 高 | P0 |
| 4 | 单供应商 vs 多供应商 | `single vs multi provider llm stack` | 团队是否应该同时买多家 | 很适合团队采购判断 | 高 | P0 |
| 5 | 隐藏成本 | `hidden costs of ai coding models` | token 之外的真实成本 | 很容易形成差异化 | 高 | P0 |
| 6 | 国家地区选择 | `best AI model provider in [country]` | 不同国家怎么买更合适 | 适合做区域集群页 | 高 | P1 |
| 7 | 多语言能力对比 | `best multilingual model for coding teams` | 多语言支持与本地化工作流 | 跨国团队意图强 | 中 | P1 |
| 8 | 平台路径对比 | `OpenRouter vs Requesty vs Together API` | 路由平台与推理平台之间怎么选 | 比较意图强 | 高 | P0 |
| 9 | 工具栈定制页 | `best model for Cursor Cline Roo Code` | 不同 AI coding 工具适配什么模型 | 贴近真实使用场景 | 高 | P0 |
| 10 | 价格更新追踪 | `llm pricing change tracker` | 价格变动、降价、套餐变化日志 | 适合长期更新与回访 | 中 | P1 |

### 6.1 不要把“全球前 20 大模型”当成天然真相

“前 20”不是自然存在的事实，而是编辑口径。

所以必须先定义入选方法：

1. 有公开官方 API 或公开计费入口。
2. 在 AI coding / agent 场景有现实使用价值。
3. 价格信息可公开获取并持续更新。
4. 有足够讨论度或真实采用度。
5. 能进入统一比较口径。

如果这五条不成立，就不能把“前 20”写成客观事实。

## 7. 这 10 个方向应该如何落成站点结构

### 7.1 更合理的站点结构

不建议只做一页《全球大模型价格对比》。

更建议搭成下面这种站点结构：

1. `Pillar`
   采购方案总对比页
2. `Decision Pages`
   直连 vs 中转、单家 vs 多家、便宜但够用
3. `Provider / Routing Platform Pages`
   OpenRouter、Requesty、Together、Groq 等
4. `Tool-Specific Pages`
   Cursor、Cline、Roo Code、Claude Code 等
5. `Country Pages`
   美国、欧盟、印度、日本、巴西等市场页
6. `Change Log / Tracker`
   价格、套餐、缓存、工具调用政策变动记录

### 7.2 推荐的内容层级

建议形成：

`总入口页 -> 决策页 -> 厂商页 / 国家页 / 工具页 -> 更新追踪页`

这样更符合：

1. 用户决策路径。
2. 内链结构。
3. 更新维护方式。
4. SEO 覆盖深度。

### 7.3 防止关键词 cannibalization 的页面归属规则

这类采购主题特别容易出现“每页都在讲一点，但每页都在抢同一批 query”的问题，所以必须提前声明页面归属。

建议规则如下：

1. `AI coding model procurement options`
   只拥有 broad overview / all providers / compare all options 这类总览查询。
2. `best cheap model for coding agents`
   只拥有 low-cost decision / cheapest usable / budget recommendation 这类预算决策查询。
3. `direct API vs OpenRouter`
   只拥有 direct vs relay / official vs router / routing tradeoff 这类采购路径比较查询。
4. `single vs multi provider llm stack`
   只拥有 team architecture / redundancy / failover / governance 这类团队架构查询。
5. `best AI model provider in [country]`
   只拥有市场或国家条件强相关的查询，不抢全局总对比词。
6. `best model for Cursor Cline Roo Code`
   只拥有工具适配词，不抢总采购词。
7. `OpenRouter vs Requesty vs Together API`
   必须明确声明页面比较的是“采购与接入路径”，不是暗示这些平台在产品类别上完全等价。

执行规则：

1. 一个 query 只能有一个拥有页面。
2. 其他页面可以提及，但应该内链过去，而不是重复争抢。
3. 如果两页都能回答同一类 query，就必须收紧其中一页的标题、slug 和 thesis。
4. 国家页不应在 demand research 之前批量生成，否则很容易变成低差异页面。

## 8. 前端真正需要的不是“搜索 agent”，而是“机会判断 agent”

### 8.1 建议的能力分工

建议把前端智能层拆成一个 `Planning Swarm` 加一个收口节点，而不是一个黑盒：

1. `Intent Clarifier`
   把用户原话转成结构化意图。
2. `Demand Analyst`
   去看趋势、搜索结果、媒体讨论、社区讨论，判断是否值得公开发布。
3. `Competition Analyst`
   看现有 SERP、内容空缺和切入难度。
4. `Monetization Analyst`
   看商业意图、广告、affiliate、咨询和 B2B 价值。
5. `Opportunity Judge`
   汇总前 4 个角色的判断，输出唯一的 `OpportunitySpec`。

### 8.2 为什么不建议一个超大 agent 全包

如果把“澄清、搜、判断、采集、写作”都交给一个大 agent，会有这几个风险：

1. 不稳定。
2. 很难复核。
3. 很难做用户确认。
4. 很难做质量门禁。
5. 很难做长期运营和回放。

更适合的方式是：

`一个对外助手 + 一个 Planning Swarm + 一个裁决节点 + 确定性 worker`

### 8.3 公允建议

所以，如果你问“是不是应该先做一个 agent，专门把用户输入结构化，并输出真正有价值的主题”，我的判断是：

**是，而且这是你们当前最值得优先做的 agent。**

但实现时要记住：

1. 对外可以像一个 agent。
2. 对内不能只有一个黑盒。
3. 一定要把中间态固化成结构化对象。
4. 四角色只是当前 `v1` 最小合理拆分，不是不可变的终局答案。

### 8.4 机会预测层应该预测什么

这里可以借鉴 `MiroFish` 的“预测”思路，但必须改成：

`机会预测`

而不是：

`玄学预测`

也就是说，我们不预测“未来一定会有多少流量”，而是预测下面这些更可验证的对象：

1. 这个主题未来 4 到 12 周的讨论和搜索机会是否在上升。
2. 哪个切角最可能成为流量入口。
3. 哪种页面类型最可能形成长期更新资产。
4. 哪个市场和语言组合最值得先发。

### 8.5 机会预测层的信号来源

建议这层在 `v1` 里主要看 5 类推荐信号族，而不是社会模拟人格。

这里的 5 类信号是：

`v1 signal families`

不是封闭列表，也不是永久固定制度。后续应根据真实案例补充、删减或调整权重。

1. `搜索信号`
   Google Trends、Autocomplete、People Also Ask、SERP 新鲜度。
2. `社区信号`
   Reddit、YouTube、X、GitHub、Hacker News、媒体讨论速度。
3. `商业信号`
   CPC、广告密度、落地页密度、供应商竞价程度。
4. `内容信号`
   现有结果是不是老旧、浅层、抄表、缺对比。
5. `更新信号`
   这个主题是否持续变化，值得长期维护。

如果后续案例表明这 5 类信号还不够，应允许扩展新的信号族，例如：

1. `Geo/Localization Signals`
   支付、税务、法规、本地平台和语言差异。
2. `Conversion Signals`
   注册、咨询、报价、表单提交等转化意图。
3. `Freshness Signals`
   对新版本、新政策和新价格变动的敏感度。
4. `Authority Signals`
   官方文档、官方博客、开发者社区是否持续强化该主题。

### 8.6 当前最稳的工程建议

对 OpenFons 当前阶段，更合理的工程策略是：

1. 先按这套 `v1` 架构搭建。
2. 先用真实案例验证命中率和收敛质量。
3. 再决定这 4 个角色是不是要合并、拆分或扩展。

也就是说，当前最稳的顺序是：

`先实现 -> 先复盘 -> 再优化`

而不是：

`先抽象到完全确定 -> 再开始做`

## 9. 这个主题的采集真源应该怎么定义

### 9.1 来源分层

建议把来源权重固定如下：

1. `Primary`
   官方定价页、官方 API 文档、官方状态页、官方可用地区说明、官方计费说明。
2. `Secondary`
   官方 GitHub、官方 changelog、官方博客、开发者文档中的缓存 / batch / tool call 说明。
3. `Corroboration`
   社区讨论、GitHub issues、开发者实测、论坛经验。
4. `Discovery Only`
   媒体文章、博客转载、聚合对比站、affiliate 页面。

### 9.2 真正该比较的不是“价格”，而是“总拥有成本”

建议统一成下面这些口径：

1. `base_input_price`
2. `base_output_price`
3. `cached_input_price`
4. `batch_discount`
5. `tool_call_cost`
6. `search_cost`
7. `code_execution_cost`
8. `container_or_session_cost`
9. `rate_limit_or_access_tier`
10. `region_availability`
11. `billing_currency`
12. `invoice_or_tax_notes`

只要不把这些口径整理齐，一张“价格对比表”就很容易误导用户。

## 10. 与 MiroFish 的关系：可以借鉴什么，不该照搬什么

`MiroFish` 更适合作为你们前期“外部包装与可见度”的参考，不适合作为你们主线架构的直接模板。

### 10.1 值得借鉴的点

从公开仓库页面可以看到，`MiroFish` 至少有这些值得借鉴的外部表达动作：

1. GitHub 展示包装强。
   它有中英双语 README、截图、视频、在线 Demo、社媒入口。
2. 输出物导向清晰。
   README 里明确强调“上传种子材料 + 自然语言描述需求 -> 返回详尽预测报告与可交互世界”。
3. 报告感强。
   它不是只讲技术，而是在讲“我能给你什么交付物”。
4. 提供了较低门槛的接入心智。
   README 中环境变量说明采用了 OpenAI SDK 兼容接口思路，这种“兼容层”对用户理解成本更低。

### 10.2 不该直接照搬的点

1. 你们不能让叙事先于证据。
   OpenFons 的核心竞争力还是 Evidence、可复核和可更新。
2. 你们不能让“炫 demo”替代“可运营页面体系”。
3. 你们不能直接把别人的架构描述当成自己的真源设计。
4. 许可证边界要注意。
   `MiroFish` 仓库公开页显示为 `AGPL-3.0`，如果未来参考或引入代码，必须额外做许可证评估。

### 10.3 对你们真正有帮助的借鉴结论

对 OpenFons 来说，`MiroFish` 最值得学的不是内部模拟逻辑，而是：

1. 如何把复杂系统包装成用户一眼能懂的故事。
2. 如何用截图、视频、Demo 和 README 提升外部传播。
3. 如何让“输入 -> 过程 -> 输出”一条链在公开页面上讲得足够直观。

## 11. Portfolio 级 TaskSpec 示例

```json
{
  "taskId": "task_ai_procurement_portfolio_001",
  "opportunitySpecRef": "opp_ai_procurement_portfolio_v1",
  "intent": "seo_topic_portfolio_planning",
  "profile": "report_web",
  "topic": "AI coding and agent model procurement",
  "mode": "public_report_portfolio",
  "audience": "pending_resolution",
  "geo": "pending_resolution",
  "language": "pending_resolution",
  "searchIntent": "mixed",
  "keywordSeed": "全球大模型价格对比",
  "keywordCluster": {
    "primaryCandidates": [
      "AI coding model procurement options",
      "best cheap model for coding agents",
      "direct API vs OpenRouter"
    ],
    "secondaryCandidates": [
      "single vs multi provider llm stack",
      "hidden costs of ai coding models",
      "best AI model provider by country"
    ]
  },
  "trafficFit": {
    "status": "pending_validation",
    "marketCandidates": [
      "US/en",
      "EU/en",
      "IN/en",
      "JP/ja",
      "BR/pt-BR",
      "CN/zh-CN"
    ],
    "notes": "Do not lock geography or language until demand research is complete."
  },
  "evidenceRequirements": [
    "official_pricing_pages",
    "official_cost_policy_docs",
    "official_region_availability_docs",
    "community_corroboration",
    "commercial_source_crosscheck"
  ],
  "goal": "discover and prioritize SEO-worthy page directions for AI model procurement",
  "planningStages": [
    "structure_intent",
    "run_demand_analysis",
    "run_competition_analysis",
    "run_monetization_analysis",
    "judge_opportunity",
    "confirm_user_scope"
  ],
  "deliveryStage": [
    "validate_evidence_feasibility",
    "score_confirmed_directions",
    "build_portfolio_report"
  ]
}
```

## 12. Portfolio 级 WorkflowSpec 示例

```json
{
  "policyVersion": "v1",
  "sourceRegistryVersion": "v1",
  "sourceRouting": [
    "official_provider_pricing_pages",
    "official_provider_api_docs",
    "official_provider_region_docs",
    "official_provider_status_pages",
    "official_relay_pricing_pages",
    "official_relay_routing_docs",
    "github_repos_and_issues",
    "community_discussions",
    "google_search_serp",
    "google_trends"
  ],
  "sourcePolicy": {
    "official_provider_docs": "primary",
    "official_relay_docs": "primary",
    "github_and_changelog": "secondary",
    "community_discussions": "corroboration",
    "affiliate_and_media_pages": "discovery_only"
  },
  "planningSteps": [
    {
      "step": "structure_intent",
      "goal": "fix audience, geo, language, budget sensitivity, and decision mode"
    },
    {
      "step": "run_demand_analysis",
      "goal": "measure discussion intensity, search demand, and decision intent"
    },
    {
      "step": "run_competition_analysis",
      "goal": "identify SERP saturation, content gaps, and page-level entry points"
    },
    {
      "step": "run_monetization_analysis",
      "goal": "evaluate ads, affiliate, consulting, and B2B procurement value"
    },
    {
      "step": "judge_opportunity",
      "goal": "collapse planning outputs into a single OpportunitySpec"
    },
    {
      "step": "confirm_user_scope",
      "goal": "freeze the launch direction after user confirmation"
    }
  ],
  "executionSteps": [
    {
      "step": "collect_evidence",
      "goal": "gather official pricing, routing rules, region availability, and hidden-cost signals"
    },
    {
      "step": "normalize_cost_dimensions",
      "goal": "map provider pricing into unified cost fields"
    },
    {
      "step": "apply_source_weighting",
      "goal": "block conclusions supported only by vendor marketing or affiliate pages"
    },
    {
      "step": "score_confirmed_directions",
      "goal": "rank confirmed directions by demand, evidence, business fit, difficulty, and updateability"
    },
    {
      "step": "build_portfolio_brief",
      "goal": "output launch order, internal linking, and update requirements"
    }
  ],
  "executionMode": {
    "research": "parallel",
    "publishing": "serial_then_parallel"
  }
}
```

## 13. Portfolio 级 ReportSpec 示例

```json
{
  "templateMode": "investment_style_portfolio",
  "templateId": "seo_topic_portfolio_v1",
  "title": "AI Coding Model Procurement Opportunity Map",
  "slug": "ai-coding-model-procurement-opportunity-map",
  "audience": "pending_resolution",
  "geo": "pending_resolution",
  "language": "pending_resolution",
  "primaryKeyword": "pending_validation",
  "supportingKeywords": [
    "AI coding model procurement options",
    "best cheap model for coding agents",
    "direct API vs OpenRouter"
  ],
  "trafficFitSummary": "Pending demand validation across candidate markets and languages.",
  "evidenceRequirements": [
    "official_pricing_pages",
    "official_region_docs",
    "official_cost_policy_docs",
    "community_corroboration"
  ],
  "sections": [
    "Executive Summary",
    "Why This Topic Has Long-Term Traffic Value",
    "10 Candidate Directions",
    "Cost Normalization Framework",
    "Direct vs Multi-Direct vs Relay Decision Map",
    "Country and Language Expansion Plan",
    "Launch Order Recommendation",
    "Evidence Appendix",
    "Update Log"
  ],
  "artifacts": [
    "nextjs_page",
    "priority_matrix",
    "procurement_decision_tree",
    "internal_link_map"
  ]
}
```

## 14. 单页执行案例：选择“直连 vs 中转”方向

假设用户在 10 个方向里选择：

`direct API vs OpenRouter`

那么应该从 portfolio 任务编译出新的单页任务。

这里额外假设：

上一层 portfolio 研究已经完成市场与语言判断，并确认这个方向优先落在 `US / en` 市场，因此下面的市场参数是显式假设，不是系统默认值。

### 14.1 单页 TaskSpec

```json
{
  "taskId": "task_direct_vs_relay_001",
  "intent": "procurement_decision",
  "profile": "seo_report_web",
  "topic": "direct API vs relay for AI coding teams",
  "mode": "public_report",
  "audience": "small AI teams",
  "geo": "US",
  "language": "en",
  "searchIntent": "comparison",
  "keywordSeed": "全球大模型价格对比",
  "keywordCluster": {
    "primary": "direct API vs OpenRouter",
    "secondary": [
      "official API vs relay for coding agents",
      "should my team buy direct or use a router",
      "OpenRouter vs direct API pricing"
    ]
  },
  "trafficFit": {
    "status": "validated_for_launch",
    "reason": "This page answers a recurring procurement decision with clear evidence sources and strong business intent."
  },
  "angle": "When direct API is cheaper or safer, and when routing is more practical",
  "evidenceRequirements": [
    "official_provider_pricing_docs",
    "official_relay_pricing_docs",
    "official_routing_or_limit_docs",
    "community_usage_examples"
  ],
  "sources": [
    "official_docs",
    "official_pricing_pages",
    "community_corroboration"
  ]
}
```

### 14.2 单页 WorkflowSpec

```json
{
  "sourceRouting": [
    "official_provider_pricing_pages",
    "official_relay_pricing_pages",
    "official_relay_routing_docs",
    "official_rate_limit_docs",
    "community_discussions"
  ],
  "qualityGateRules": [
    "no conclusion based only on affiliate pages",
    "must distinguish pricing from total cost",
    "must separate solo developer advice from team procurement advice"
  ],
  "fetchPlan": [
    {
      "step": "collect_official_pricing",
      "goal": "capture direct and relay pricing sources with timestamp"
    },
    {
      "step": "collect_routing_rules",
      "goal": "extract provider routing, failover, and rate-limit differences"
    },
    {
      "step": "collect_hidden_cost_signals",
      "goal": "capture caching, tool calls, retries, and governance overhead"
    },
    {
      "step": "normalize_cost_fields",
      "goal": "convert sources into comparable procurement dimensions"
    },
    {
      "step": "quality_gate",
      "goal": "drop weak or vendor-only claims"
    },
    {
      "step": "build_evidence_set",
      "goal": "freeze citation-ready evidence"
    },
    {
      "step": "compile_report_spec",
      "goal": "prepare the Next.js comparison page"
    }
  ]
}
```

### 14.3 单页 ReportSpec

```json
{
  "templateMode": "investment_style_compare",
  "templateId": "compare_procurement_path_v1",
  "title": "Direct API vs OpenRouter for AI Coding Teams",
  "slug": "direct-api-vs-openrouter-ai-coding",
  "audience": "small AI teams",
  "geo": "US",
  "language": "en",
  "primaryKeyword": "direct API vs OpenRouter",
  "supportingKeywords": [
    "official API vs relay for coding agents",
    "should my team buy direct or use a router",
    "OpenRouter vs direct API pricing"
  ],
  "trafficFitSummary": "Validated after portfolio-stage demand research for recurring procurement intent.",
  "evidenceRequirements": [
    "official_provider_pricing_docs",
    "official_relay_pricing_docs",
    "community_usage_examples"
  ],
  "sections": [
    "Quick Answer",
    "Executive Summary",
    "Where Direct API Wins",
    "Where Relay Wins",
    "Hidden Costs and Risks",
    "Decision Tree by Team Type",
    "Evidence Appendix",
    "Update Log"
  ],
  "artifacts": [
    "nextjs_page",
    "comparison_matrix",
    "decision_tree",
    "schema_metadata"
  ]
}
```

## 15. 页面应该长成什么样

既然你们要的是“投行 PPT 风格的网页”，那它不应写成普通博客。

建议固定结构：

1. `Thesis`
   一句话核心判断。
2. `Executive Summary`
   3 到 5 条关键发现。
3. `Decision Tree`
   让用户快速判断直连、多家直连、还是路由。
4. `Cost Waterfall`
   把总成本拆开。
5. `Comparison Matrix`
   清楚呈现适用人群、优点、风险、限制。
6. `Evidence-backed Analysis`
   每个关键结论都能回到证据。
7. `Risks / Unknowns`
   明确边界和待验证点。
8. `Update Log`
   做成长线可运营资产。

## 16. 第一批最值得上线的 3 个方向

如果前期 demand research 支持，建议先做这 3 个：

1. `AI coding model procurement options`
2. `best cheap model for coding agents`
3. `direct API vs OpenRouter`

原因：

1. 一篇 pillar page。
2. 一篇强商业决策页。
3. 一篇高争议、高转化比较页。

这三页组合最容易同时拿到：

1. 顶层覆盖。
2. 决策流量。
3. 后续扩展空间。

## 17. 页面发布后应该怎么运营

### 17.1 不是发完就结束

建议流程：

1. `Week 1`
   检查抓取、索引、canonical 和结构化数据。
2. `Week 2-4`
   看 Search Console 的查询、曝光、点击和 CTR。
3. `Month 2`
   根据真实 query 反向扩展国家页、工具页和 FAQ。
4. `持续`
   追踪价格变化、缓存政策变化、路由策略变化和地区可用性变化。

### 17.2 真正的增长点

真正的长期增长，不只是“多发页面”，而是：

1. 建更新日志。
2. 建对比矩阵。
3. 建国家页。
4. 建工具页。
5. 建采购决策树。

## 18. 最终建议

### 18.1 这条思路是否合理

结论：**合理，而且值得优先做。**

### 18.2 但需要改成下面这个版本

不是：

`用户一句话 -> agent 去搜 -> 直接生成页面`

而是：

`用户一句话 -> Intent-to-Opportunity Agent -> 用户确认 -> 受控采集 -> EvidenceSet -> AI + 人工复核 -> ReportSpec -> Next.js 页面`

### 18.3 最重要的公允判断

如果你问：

> 我们是不是更需要一个 agent，把用户输入结构化，再输出真正有价值的主题？

我的判断是：

**是，这就是你们前面最应该先做的能力。**

但它不应只是“聊天更聪明”，而应是：

1. 有稳定中间态。
2. 有流量判断门禁。
3. 有来源分层。
4. 有用户确认节点。
5. 有后续 worker 的编译输出。

只有这样，后面的采集、清洗、总结和 Next.js 报告页面才会越来越准，而不是越来越散。

## 19. 参考来源

### 19.1 公开产品与站点结构参考

1. [MiroFish GitHub](https://github.com/666ghj/MiroFish)

### 19.2 官方定价与能力真源建议

以下应作为未来价格采集和更新的优先真源：

1. [OpenAI API Pricing](https://platform.openai.com/pricing)
2. [Google Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
3. [DeepSeek Pricing](https://api-docs.deepseek.com/quick_start/pricing/)
4. [OpenRouter Pricing](https://openrouter.ai/pricing)
5. [Together AI Pricing](https://www.together.ai/pricing)
6. [Groq Pricing](https://groq.com/pricing)
7. [Alibaba Cloud Model Studio Pricing](https://help.aliyun.com/zh/model-studio/model-pricing)

### 19.3 使用这些来源时的注意事项

1. 所有价格都必须带时间戳。
2. 所有价格都必须说明计费口径。
3. 所有“最优推荐”都不能只由单一商业页面支撑。
4. 所有地区结论都必须区分“官方可用性”和“用户实际采购便利性”。
