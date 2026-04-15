# Multi-Platform External Materials Matrix - 2026-04-14

## One-Sentence Conclusion

OpenFons 的目标范围确实是多平台，而不是只做 `YouTube / yt-dlp`；但不同平台所需的真实外部材料完全不同。当前正式 route 已不只 `youtube / tiktok`，还新增了低阻力的 `hacker-news` 官方 API 路线；其它平台更多仍处于实验室验证、兼容性验证或参考借鉴层。

## Why This Matrix Exists

在 2026-04-14 的二次文档重读后，需要把下面三件事严格分开：

1. 项目的总平台范围
2. 当前正式 SoT 已证明到哪条 route
3. 每个平台最小真实外部前置条件是什么

如果不把这三件事拆开，就很容易反复发生两类误判：

- 把 `yt-dlp` 这类单点工具误说成整个项目的外部条件代名词
- 把历史上提到过的平台都误说成“当前已正式接入并已具备真机 smoke 证据”

## Sources Rechecked

本矩阵基于以下文档重新整理：

- `docs/sot/开放源平台当前正式架构说明.md`
- `docs/sot/开放源平台技术团队说明.md`
- `docs/workbench/openfons-v001-v012-evolution-summary.md`
- `docs/workbench/openfons-v013-sot-gap-and-next-scope-decision-2026-04-13.md`
- `docs/workbench/openfons-external-runtime-smoke-closure-status-2026-04-14.md`
- `docs/workbench/config-center-current-status-and-boundaries-2026-04-14.md`
- `docs/history/plan1/第一阶段采集工具兼容性验证.md`
- `docs/workbench/北美利基内容采集、分析与内容变现路线.md`

## How To Read This Matrix

### Evidence Level

- `A. formal-route`
  - 当前仓库正式代码、SoT 或当前 workbench 状态里，已经有明确 route、配置中心接线或 smoke 证据
- `B. lab-validated`
  - 已做过安装、导入、CLI、基础抓取或兼容性验证，但还不是当前正式收口的 route
- `C. reference-only`
  - 主要是架构参考、策略参考或候选来源，不应误读成当前正式运行主线

### Material Categories

- `host-runtime`
  - 本机必须真实存在的运行器、解释器、浏览器、CLI、容器服务
- `credentials`
  - API key、client id、client secret、app token 等平台凭据
- `session`
  - cookie、session、浏览器 token、登录态导出物
- `account`
  - 用户名、密码、账号池、真实登录身份
- `network`
  - proxy、代理池、地区网络、可访问平台的本机链路

## Matrix A: Current Formal Or Near-Formal Runtime Routes

| Platform / Route | Project Role | Evidence Level | Current Repo / SoT Status | Minimum External Materials | Can Start On Local Network Only? | Fair Judgment |
| --- | --- | --- | --- | --- | --- | --- |
| `search / google` | discovery / planning / evidence search | `A. formal-route` | 已进入 `config-center -> search-gateway -> control-api` 正式链路 | `credentials`: `google-api-key`, `google-cx` | 否，至少需要 Google 侧凭据 | 这是正式平台能力，但不属于 crawler smoke；它解决“发现与搜索”，不是平台登录抓取 |
| `search / ddg` | discovery / planning / evidence search | `A. formal-route` | 已进入正式链路，且是 fallback provider | 通常只需 `host-runtime`: 本机网络 | 是 | 这是当前最轻的外部条件之一，但它不替代需要登录态的平台抓取 |
| `youtube / yt-dlp` | video / media public-first collection | `A. formal-route` | route resolution、preflight、smoke harness 都已存在；当前 external smoke blocked | `host-runtime`: `yt-dlp` 可执行文件；`network`: 当前 route 还绑定了 `global-proxy-pool` | 理论上可以，但当前 route 配置下还受 proxy 配置影响 | 这是当前正式 smoke 证据最明确的一条线，但只是多平台体系中的一个公开视频 route |
| `tiktok / tiktok-api` | short-video / auth-sensitive collection | `A. formal-route` | route resolution、preflight、smoke harness 都已存在；当前 external smoke blocked | `host-runtime`: `uv`、`.env_uv`、Python bridge；`session`: `tiktok-cookie-main`；`account`: `tiktok-account-main`；`session`: `pinchtab-token`；`network`: `global-proxy-pool` | 通常不够 | 当前正式证据表明它不是“开箱即用”路线，真实 cookie / account / browser token 是主要 blocker |
| `hacker-news / official-api` | community discovery / discussion evidence | `A. formal-route` | 已进入正式 `config-center -> crawler route -> preflight -> doctor -> smoke harness` 链路 | `host-runtime`: 本机网络 | 是 | 这是当前最低阻力的正式 community route，不依赖账号、cookie 或 proxy 材料 |

## Matrix B: Important Platforms Mentioned In Docs But Not Yet Formally Closed As Current Runtime Routes

| Platform | Project Role In Docs | Evidence Level | Current Evidence | Minimum External Materials | Can Start Without Account? | Fair Judgment |
| --- | --- | --- | --- | --- | --- | --- |
| `Reddit / PRAW` | 北美核心研究源之一 | `B. lab-validated` | 兼容性文档证明：无正式凭据时 `PRAW` 返回 `401`；公开 JSON 也可能 `403` | `credentials`: Reddit app 凭据；可能还需要 `account` | 部分公开路径可以先试，但不稳定 | 平台很重要，但不能把“研究价值高”误读成“当前已正式跑通” |
| `X / twscrape` | 热点与传播链研究源 | `B. lab-validated` | CLI / SQLite 运行时验证通过；无账号池时直接 `No active accounts` | `account`: 账号池；常见还需要 `session` 与 `network` | 基本不行 | 这是典型的“工具能装，但真实使用主要受账号池约束”的平台 |
| `Amazon / API + review scraper` | 商业研究与评价研究源 | `B. lab-validated` | `amazon-review-scraper` 有公开正向信号；PAAPI 路径仍依赖凭据 | `credentials`: PAAPI 类凭据，或特定公开抓取路径；部分路径仅需 `network` | 部分可以 | Amazon 更像“两条线”：商品信息偏 API-first，评论抓取偏公开页面或轻量脚本 |
| `V2EX` | 补充社区源 | `B. lab-validated` | JSON API 已返回真实数据 | `host-runtime`: 本机网络 | 是 | 它不是北美主源，但属于低材料成本的补充平台 |
| `Facebook` | 补充研究源 | `B. lab-validated` | 导入成功，但匿名公共页有效字段偏弱 | 通常至少需要 `session` 或更强浏览器路径；可能要 `network` | 有限 | 不能高估其匿名抓取价值 |

## Matrix C: CN Social / Browser-Heavy Reference Tracks

| Platform Family | Project Role In Docs | Evidence Level | Current Evidence | Minimum External Materials | Fair Judgment |
| --- | --- | --- | --- | --- | --- |
| `小红书 / 抖音 / 快手 / B站 / 微博 / 贴吧 / 知乎` | 国内新媒体专用 worker / adapter 参考轨 | `C. reference-only` to `B. lab-validated` | `MediaCrawler` 已完成仓库级安装、CLI、DB 初始化、WebUI 健康检查；未完成带登录态真实抓取 | `host-runtime`: Playwright / Python / 浏览器环境；`session`: cookie / 登录态；`account`: 真实账号；`network`: 代理或地区网络经常重要 | 文档明确认为这类平台很重要，但当前更像结构参考和实验室基线，不应误说成正式商业主线依赖 |
| `pinchtab` | browser-runtime bridge | `B. lab-validated` and partly `A` through config-center wiring | Docker 镜像和 health/snap 已验证；当前配置中心正式接线已存在 | `host-runtime`: Docker 服务；`session`: `pinchtab-token`；还要 `allowedDomains` 正确配置 | 它不是平台本身，而是登录态/浏览器桥接底座；很多高阻力平台是否可跑，取决于它是否有真实 token 和会话 |
| `camoufox` | high-resistance browser fallback | `B. lab-validated` | 宿主机真实打开页面成功 | `host-runtime`: 浏览器与宿主环境；常常还需 `network`、`proxy` | 这是高成本兜底能力，不是默认浏览器链路 |
| `scrapling` | adaptive anti-detect HTTP crawler | `B. lab-validated` | 安装和实例化通过，真实抓取受 Windows SSL 环境影响 | `host-runtime`: Python runtime；部分站点可能需要 `network` / 证书修复 | 更像技术路线补充，不应自动视为全平台默认抓取器 |

## Matrix D: External Materials By Category

| Material Category | What It Means In Plain Language | Typical Examples In OpenFons Docs | Who Usually Needs It |
| --- | --- | --- | --- |
| `host-runtime` | 这台机器上真实存在并能执行的工具或运行器 | `yt-dlp`、Python、Playwright、`pinchtab`、浏览器二进制 | YouTube、TikTok、browser-heavy 平台、MediaCrawler 参考轨 |
| `credentials` | 平台官方或半官方接口要求的凭据 | `google-api-key`、`google-cx`、PRAW/PAAPI 类 app credentials | Search、Reddit、Amazon 等 API-first 路线 |
| `session` | 真实登录后才能得到的会话材料 | `tiktok-cookie-main`、`pinchtab-token`、cookie/session 文件 | TikTok、ytcog、browser-runtime、国内社媒 |
| `account` | 真实平台身份本身 | `tiktok-account-main.json`、X 账号池、登录态用户 | X、TikTok、国内社媒、部分 browser-automation 路线 |
| `network` | 访问平台所需的链路、地区、代理条件 | `global-proxy-pool.json`、本机可访问网络、地区网络条件 | 高阻力平台、需要匿名稳定性的平台、国内外跨区访问 |

## What This Means Practically

### 1. 不是所有平台都需要账号

按文档，至少下面这些平台或路径可以先用较轻材料启动：

- `ddg`
- `Hacker News`
- `V2EX`
- `YouTube` 的部分公开视频路径
- `Amazon` 的部分公开评价路径

### 2. 不是所有平台都能只靠本机网络

按文档，下面这些平台通常不能乐观地假设“本机直连就足够”：

- `TikTok`
- `X / twscrape`
- `Reddit / PRAW` 的正式 API 路径
- `Facebook`
- 国内社媒平台族

### 3. 真正缺的不是一个工具，而是按平台拆开的材料组合

更准确的问题不是：

> “我们到底要不要装 `yt-dlp`？”

而应该是：

> “对于我们当前准备优先验证的平台集合，每个平台最小需要哪一组 host-runtime / credentials / session / account / network 条件？”

## Recommended Priority Order

基于当前文档的公允建议，优先顺序应分成两层。

### Layer 1: 先打透当前正式已接线且证据最明确的 route

1. `youtube / yt-dlp`
2. `tiktok / tiktok-api`
3. `hacker-news / official-api`

原因不是因为项目只剩这两个平台，而是因为：

- 当前正式 route、preflight、smoke harness 证据最明确
- 配置中心、doctor、readiness、runtime resolution 已经真的连到了这里

### Layer 2: 再把高价值但尚未正式 smoke 收口的平台拉成下一批

1. `Reddit`
2. `X`
3. `Amazon`
4. `CN social` 参考轨

这层的关键不是继续空想，而是要先补“每个平台的最小外部材料包”。

## Fair Final Judgment

最准确的判断应当是：

1. OpenFons 的目标范围是多平台，不是 YouTube-only。
2. 但当前正式已证明到 external smoke / preflight 粒度的 route，并没有覆盖所有平台。
3. 因此不能把 `yt-dlp` 误说成整个项目的外部条件总代名词。
4. 也不能反过来因为项目是多平台，就假装当前所有平台都已经进入同等完成度。

最公允的状态标签是：

`multi-platform in scope; route-by-route external materials still differ; current formal routes now cover youtube, tiktok, and hacker-news with very different material costs`
