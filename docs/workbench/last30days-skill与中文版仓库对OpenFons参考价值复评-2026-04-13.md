# last30days-skill 与中文版仓库对 OpenFons 参考价值复评

> 生成日期：2026-04-13  
> 文档定位：工作台复评文档，不替代 `docs/sot/**`，不作为实施计划。  
> 复评对象：`mvanhorn/last30days-skill`、`Jesseovo/last30days-skill-cn`。  
> 复评原因：这次不是只看 README，而是按用户要求把两个仓库拉到本地看代码结构后，重新判断它们对 OpenFons 的参考价值。

## 一句话结论

这两个仓库对 OpenFons 有参考价值，但价值集中在“搜索/采集执行层、operator 诊断体验、降级策略和持续观察工作流”，不适合直接成为 OpenFons 的平台主运行时，也不应该推翻 `v010-v012` 已经收口的 config-center 主线。

更准确的判断是：

- 方法论可借鉴：中高，约 `50%-60%`。
- 代码可直接复用：低，约 `10%-15%`。
- 对 `search-gateway / crawler adapter / Evidence ranking / operator UX` 的参考价值：高。
- 对 `contracts / config-center / control-api` 的直接替代价值：低。
- 对商业化主线的合规参考价值：谨慎，尤其是中文版仓库对爬虫商业用途的免责声明与 MIT 许可证表达存在张力。

## 本次实际检查范围

本次已将两个仓库拉到本地 `.tmp/` 下做结构级阅读：

- `mvanhorn/last30days-skill`
  - 本地路径：`.tmp/last30days-skill`
  - 最近提交：`01812ec1851e5c3d92a9049a41b7da4adbfbcb5d`
  - 最近提交时间：`2026-04-11 11:37:27 -0400`
  - `tests/` 目录文件数量：`63`
  - 主要入口：`scripts/last30days.py`
  - 主要流水线：`scripts/lib/pipeline.py`
  - 配置与凭据处理：`scripts/lib/env.py`
  - 首次运行与设备授权：`scripts/lib/setup_wizard.py`
  - 本地持久化与 watchlist：`scripts/store.py`、`scripts/watchlist.py`、`scripts/briefing.py`

- `Jesseovo/last30days-skill-cn`
  - 本地路径：`.tmp/last30days-skill-cn`
  - 最近提交：`50733fe1039328a3c0c44ac1c681aec9a89ee17d`
  - 最近提交时间：`2026-04-12 17:03:24 +0800`
  - `tests/` 目录文件数量：`11`
  - 主要入口：`scripts/last30days.py`
  - 国内平台桥接：`scripts/lib/crawler_bridge.py`
  - 配置处理：`scripts/lib/env.py`
  - 报告渲染：`scripts/lib/render.py`

注意：本次没有执行真实外部平台 smoke，没有使用真实 cookie、账号、API key 或 proxy。因此本文判断是“代码结构与架构适配性判断”，不是“真实平台可用性验收”。

## 两个仓库分别是什么

### `mvanhorn/last30days-skill`

它本质上是一个 agent skill 形态的多源研究工具。用户输入一个主题后，它会尝试组合 Reddit、X、YouTube、TikTok、Instagram、Hacker News、Polymarket、GitHub、Bluesky、Perplexity、Web search 等来源，再通过 planner、rerank、cluster、render 形成研究 brief。

代码上值得注意的点：

- `pipeline.py` 已经不是简单串行脚本，而是有 `available_sources -> plan_query -> parallel retrieve -> supplemental search -> retry thin sources -> rerank -> cluster -> report` 的流水线结构。
- `env.py` 有分层配置读取：环境变量、项目 `.claude/last30days.env`、用户级 `~/.config/last30days/.env`。
- `diagnose()` 能输出 provider、X backend、ScrapeCreators、GitHub、native web backend、available sources 等诊断信息。
- `setup_wizard.py` 处理首次运行、浏览器 cookie 提取、`yt-dlp` 检查、OpenClaw server-side setup、GitHub PAT/device auth fallback。
- `store.py` 用 SQLite 保存 topics、research runs、findings、settings，并带 FTS5 搜索和 watchlist/briefing 支撑。

它对 OpenFons 的价值主要是：证明一个“多源研究工具”应该把来源可用性、降级路径、诊断、持久化观察和报告输出作为一体来设计，而不是把采集器当成孤立脚本。

### `Jesseovo/last30days-skill-cn`

它本质上是对原版的中文平台本土化 fork。它覆盖微博、小红书、B 站、知乎、抖音、微信、百度、头条等平台，重点引入 Playwright 风格的 crawler bridge，以减少 API key 依赖。

代码上值得注意的点：

- `scripts/last30days.py` 是一个单文件 CLI 编排器，使用 `ThreadPoolExecutor` 并行跑各个平台搜索。
- `crawler_bridge.py` 提供 `crawl_weibo / crawl_xiaohongshu / crawl_douyin / crawl_bilibili / crawl_zhihu` 等 Playwright 抓取函数。
- cookie 默认落在 `~/.config/last30days-cn/browser_cookies`，用于缓存登录态。
- 多个 source adapter 采用类似“先 API，再 crawler，再公开接口”的降级思路。
- `--diagnose` 能返回各平台、API、crawler engine 和 cached logins 状态。

它对 OpenFons 的价值主要是：提供一个“中文平台 adapter 设计样板”，尤其是 API、浏览器自动化、公开接口之间如何做降级。但它的工程成熟度、测试覆盖、平台边界和合规表达都不足以直接成为 OpenFons 商业主线依赖。

## 可借鉴清单

### 1. Source availability 与 operator diagnose

可借鉴程度：高。

原版 `pipeline.diagnose()` 把 provider 可用性、source 可用性、X backend、ScrapeCreators、GitHub、web backend 统一暴露出来。中文版也有 `--diagnose` 输出 Playwright、cached login 和各国内平台可用状态。

OpenFons 落点：

- `services/control-api` 的 operator API。
- `packages/config-center` 的 doctor/readiness 报告。
- `search-gateway` 和 crawler runtime 的 route preflight。

建议动作：

- 不要照搬 `diagnose()` 的数据结构。
- 把它翻译成 OpenFons 已有的 `doctor.status = ready / degraded / blocked` 和结构化 blocker 列表。
- 对每条 crawler route 输出：配置是否可解析、secret ref 是否存在、外部 binary 是否可用、真实执行是否被 external-blocked。

### 2. 多级降级策略

可借鉴程度：高。

中文版仓库最直接的价值是“API -> crawler -> public endpoint”这种降级顺序。原版仓库也在 Reddit、YouTube、X、GitHub 等源上体现了类似思想：先用更高质量来源，失败后用低门槛 backup。

OpenFons 落点：

- `crawler adapter` route policy。
- `search-gateway` provider selection。
- `config-center` 里的 plugin capability 描述。

建议动作：

- 在 OpenFons 中不要写成硬编码 fallback。
- 应该表达为 config-center 可解析的 `capability / requirement / fallbackPolicy`。
- 降级结果必须进入 Evidence metadata，避免报告中把低可信 fallback 当成主证据。

### 3. 多源并行检索和 thin-source retry

可借鉴程度：中高。

原版 `pipeline.py` 有多 subquery、多 source 并行检索，并对结果稀薄的 source 做 retry。这个比“只跑一次关键词搜索”更接近 OpenFons 的研究平台目标。

OpenFons 落点：

- `search-gateway` 的 provider orchestration。
- 后续 `WorkflowSpec` 的 retrieval step。
- Evidence candidate ranking。

建议动作：

- 借鉴“先 planner，后 retrieve，再 retry thin sources”的流程。
- 不照搬 Python 实现。
- OpenFons 应该把这层做成任务编排层的可观测步骤，让每次 retry 的原因、query、source、结果数可审计。

### 4. Report artifact 与 context 输出形态

可借鉴程度：中。

两个仓库都有 `--emit`、`report.md`、`report.json`、context snippet 或 save-dir 的思路。OpenFons 已经在 `v009` 之后把 AI procurement 报告推进到 file-backed artifact，因此这里是“补强参考”，不是新方向。

OpenFons 落点：

- `Artifact` 产物体系。
- `ReportSpec -> report-web artifact shell`。
- 后续 replay/publish acceptance。

建议动作：

- 借鉴它们“机器可读 + 人类可读 + 紧凑上下文”的三形态。
- 不回退到 skill 自己写固定目录。
- Artifact 路径、revision、manifest 应继续归 OpenFons 的 artifact delivery 体系管理。

### 5. Watchlist / briefing 的持续观察模式

可借鉴程度：中高，但不应立刻做。

原版 `store.py / watchlist.py / briefing.py` 已经开始把一次性搜索扩展成 topic watchlist 和 morning briefing。这与 OpenFons 的长期 `Topic / TopicRun / EvidenceSet / Artifact` 很契合。

OpenFons 落点：

- 未来 `TopicRun` 调度。
- EvidenceSet 增量更新。
- 报告更新和订阅机会。

建议动作：

- 作为后续 `v013` 或更晚目标的候选方向。
- 先不要引入 SQLite。
- 若 OpenFons 要做 watchlist，应先定义 `TopicRun` 和 `EvidenceSet delta` 契约，而不是照搬原版的本地 store。

### 6. Source-native scoring

可借鉴程度：中。

原版通过 upvotes、likes、Polymarket odds、GitHub stars/PR 等信号做 ranking。中文版也把互动度、时效性、相关性拆成评分维度。这与 OpenFons 的 source-native 方向一致。

OpenFons 落点：

- Evidence candidate ranking。
- ReportSpec 中的 evidence quality explanation。
- 机会门禁中的 Distribution / Authority 信号。

建议动作：

- 借鉴“来源原生指标要保留”的思想。
- 不要把不同平台指标简单归一成一个万能分数。
- 每条 Evidence 应保留原始 source metrics，再由报告层解释权重。

## 不可借鉴或要谨慎借鉴的点

### 1. 不要用 `.env + 本地 skill 状态` 替代 config-center

两个仓库都使用本地配置文件和环境变量作为主要配置来源。这对单机 skill 很合理，但对 OpenFons 已经不合适。

OpenFons 当前已经有：

- `PluginInstance`
- `ProjectBinding`
- `SecretRef`
- resolver / validator
- doctor / readiness
- revision / backup / rollback

如果为了学习这两个仓库而回到 `.env` 分散配置，就会倒退。

### 2. 不要默认自动读取或缓存真实 cookie

原版有浏览器 cookie 提取，中文版有 cookie 持久化。它们对个人单机工具很有吸引力，但 OpenFons 是平台化项目，默认策略必须更保守。

建议边界：

- 可以做 `diagnose` 检查：“是否存在可用登录态”。
- 可以做明确授权后的 local-only bootstrap。
- 不应默认扫描浏览器或写入 cookie。
- cookie、account、proxy、API key 都必须进入受控配置和 secret reference 模型，而不是散落在脚本目录。

### 3. 不要自动安装外部 runtime 当成默认修复

原版 `setup_wizard.py` 在 macOS 有 Homebrew 安装 `yt-dlp` 的路径。OpenFons 当前阶段已经明确遇到过外部 runtime / smoke blocker，默认自动安装会扩大范围，也可能改变用户机器状态。

建议边界：

- 默认只诊断，不自动安装。
- 如果需要安装，必须作为单独 scope，经用户明确批准。
- 安装动作要进入 runbook，而不是藏在业务执行路径。

### 4. 不要直接把 Playwright crawler 当商业主线依赖

中文版仓库的 README 写了“仅供学习和研究目的，严禁用于商业用途”，但 LICENSE 又是 MIT。这种表述至少会带来解释风险。OpenFons 面向商业化报告和内容变现，不能把这类实现直接作为商业主线。

建议边界：

- 可学习平台拆分、登录态、降级策略和诊断方法。
- 不直接复制实现。
- 如果未来实现中文平台 adapter，应该自研并重新做合规边界。

### 5. 不要把 agent skill 误认为平台 runtime

两个仓库都是 skill/CLI 优先。OpenFons 是平台工程，当前北极星是：

`OpportunityInput -> OpportunitySpec -> TaskSpec / WorkflowSpec -> EvidenceSet -> ReportSpec -> Artifact`

因此借鉴时必须转译为 OpenFons 契约，不要把 `/last30days` 的调用形态原样搬进平台核心。

## 模块落点建议

| 参考模式 | 来源仓库 | OpenFons 落点 | 优先级 | 建议处理 |
| --- | --- | --- | --- | --- |
| `diagnose()` 可用性报告 | 原版与中文版 | `config-center doctor`、crawler route preflight | P1 | 转译为 `ready / degraded / blocked` |
| API/crawler/public endpoint 降级 | 中文版 | crawler adapter policy | P1 | 做成配置化 fallback policy，不硬编码 |
| 多源并行检索 | 原版 | `search-gateway` / `WorkflowSpec` retrieval step | P2 | 先做设计，不急于实现 |
| thin-source retry | 原版 | retrieval orchestration | P2 | 记录 retry 原因和结果数 |
| source-native metrics | 原版与中文版 | Evidence ranking | P2 | 保留原始 metrics，再做解释层评分 |
| watchlist / briefing | 原版 | `TopicRun` 增量更新 | P3 | 等 EvidenceSet delta 契约明确后再做 |
| setup wizard | 原版 | operator onboarding / smoke runbook | P3 | 默认只诊断，不自动安装 |
| browser cookie extraction | 原版与中文版 | secret bootstrap | P3 | 只在明确授权后做 local-only flow |
| Skill packaging | 两者 | agent skill 入口与生态兼容 | P3 | 不进入核心 runtime |

## 对当前 OpenFons 阶段的判断

截至 `v012`，OpenFons 的平台配置中心已经走完读、写、回滚、doctor、runbook 和 acceptance checklist。当前缺口不是“没有一个 last30days 风格工具”，而是：

1. 真实外部 runtime / smoke 仍受 `yt-dlp`、secret、cookie、账号、proxy 等外部材料影响。
2. `docs/sot/**` 仍需同步 `v010-v012` 之后的真实平台状态。
3. 下一条主线 `v013` 尚未正式定义。
4. `search-gateway / crawler adapter / EvidenceSet` 后续如何承接 config-center，需要重新按北极星排序。

因此，这两个仓库不应该让 OpenFons 直接切回“先做 crawler 大扩展”。更稳妥的处理是：

- 先把本次复评沉淀为工作台文档。
- 如果定义 `v013`，把它们作为参考材料之一，而不是目标本身。
- `v013` 若继续内部主线，优先考虑 SoT 同步、Evidence/Artifact replay 或 retrieval orchestration 边界。
- 若用户后续提供真实 external 条件，再回到 youtube / tiktok smoke 收尾。

## 推荐结论

短期建议：

1. 保留本复评文档作为 `v013` 定义参考。
2. 不把两个仓库加入 OpenFons 依赖。
3. 不复制中文版 crawler 代码。
4. 不修改 config-center 主线。
5. 若要吸收，先吸收 `diagnose / fallback / source metrics / watchlist` 的设计模式。

中期建议：

1. 为 OpenFons 设计 `SourceReadiness` 或 `RouteReadiness` 契约，把 source availability 从口头诊断变成平台对象。
2. 为 crawler adapter 增加 `fallbackPolicy` 表达，但只在真实 smoke 条件具备后实现。
3. 把 report artifact 的 “full / json / context” 三形态纳入后续 artifact acceptance，而不是让每个 skill 自己写目录。
4. 未来做中文平台 adapter 时，参考 `last30days-skill-cn` 的平台拆分和降级顺序，但实现和合规说明保持自研。

最终判断：这两个仓库是很好的“执行层与产品体验参考”，不是 OpenFons 的“平台底座替代品”。
