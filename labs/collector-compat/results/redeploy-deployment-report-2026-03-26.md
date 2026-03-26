# 2026-03-26 重部署兼容性复测报告

> 批次日期：2026-03-26
> 查询词：`openclaw 最合适的服务器虚拟主机`
> 产物根目录：`D:\demo1\openfons\labs\collector-compat\results\artifacts\2026-03-26_redeploy_network_restored`
> 本轮总产物：43 个
> 其中 `success/` 18 个，`limitations/` 17 个，`meta/` 8 个

## 1. 结论先行

这次是在 Docker 内容被清空、网络恢复之后重新做的一轮“从部署到产物”复测，所以它比上一批更适合作为当前主参考批次。

公允判断如下：

1. OpenFons 第一阶段“先把采集能力做实”这条路是可行的，但必须接受一个现实：公开数据源、弱登录态链路、账号链路、SaaS 链路的成熟度差异非常大，不能把它们当成同一稳定等级。
2. 真正已经完成“重新部署并重新产生产物”的主力链路，是 `pinchtab`、`playwright`、`camoufox`、`crawlee`、`ddgs`、`youtube-comment-downloader`、`amazon-review-scraper`、`HackerNews/API`、`V2EX API`、`MediaCrawler` 基础运行链路。
3. `yt-dlp` 这轮没有像上一批那样直接给出稳定搜索结果，而是明确撞上了 YouTube 的反机器人校验；这不是工具完全不可用，而是说明它在真实环境里高度依赖 cookie、账号和风控条件。
4. `X / TikTok / Reddit 官方 API / Facebook 公共页 / MediaCrawler 登录态` 这些线仍然要靠账号、cookie、代理、白名单或 API 凭据来补齐，暂时不能被包装成“开箱即用”。

## 2. 哪些项目该用 Docker，哪些该走本地环境

| 类别 | 项目 | 当前建议 | 本轮实际验证 | 判断 |
| --- | --- | --- | --- | --- |
| Docker 优先 | `pinchtab` | 走官方 Docker 镜像服务化部署 | 已重新 `docker pull` + `docker run`，容器健康 | 这是当前最适合 Docker 的项目，服务边界清晰，但必须补 token 与 `allowedDomains` 配置。 |
| 宿主机 / 本地 Node 环境 | `crawlee`、`playwright`、`yt-dlp-exec`、`firecrawl`、`pinchtab` SDK | `npm install` 后直接跑 | 已完成 `npm install` 和 Node smoke，`crawlee` / `playwright` 实际抓取成功 | 适合做 OpenFons 的通用 web worker 层。 |
| 宿主机 / 本地 Python 环境 | `camoufox`、`twscrape`、`TikTokApi`、`praw`、`facebook-scraper`、`youtube-comment-downloader`、`gallery-dl`、`ddgs`、`ddddocr`、`amazon_paapi` | 走虚拟环境或 `uv` | 已完成 Python smoke，多数包导入正常 | 适合作为按平台拆分的 Python worker 集。 |
| 宿主机 / 仓库级环境 | `MediaCrawler` | 直接在仓库内 `uv sync`，使用本机浏览器与登录态 | `uv sync`、CLI help、WebUI health 都已恢复成功 | 当前更适合做宿主机集成，不建议本轮先强推 Docker 化。 |
| 免部署 / 直接 API | `HackerNews/API`、`V2EX API`、`Reddit public JSON` | 直接 HTTP 调用 | `Hacker News`、`V2EX` 成功，`Reddit public JSON` 返回 `403` | 适合做低成本数据源，但 Reddit 公共 JSON 不稳定。 |
| SaaS / 凭据驱动 | `firecrawl` | 不需要本地部署，只需 SDK + API key | 本轮只验证到 SDK 可导入、无 key | 可做增强件，不宜作为第一阶段核心采集底座。 |

### 关于 `camoufox`

这轮仍然把 `camoufox` 归入“宿主机优先”而不是 Docker 优先，原因很实际：

1. 本轮真实成功的是宿主机启动、真实打开页面、真实保存截图和 HTML。
2. 后续你们要接账号、cookie、浏览器指纹、可能还要与 `MediaCrawler` 或 CDP 联调，宿主机集成的调试成本更低。
3. `camoufox` 理论上不是不能容器化，但至少在当前批次里，我们没有把 Docker 版跑成主验证路径，因此不能把它写成“已验证的 Docker 部署能力”。

## 3. 重部署后的逐项复测矩阵

| 项目 | 部署方式 | 本轮结果 | 实际产物 | 复用判断 |
| --- | --- | --- | --- | --- |
| `pinchtab` | Docker | 成功，但宿主机接口受安全策略限制 | 健康检查 JSON、快照 JSON、容器日志、镜像摘要 | 可复用为浏览器服务，但必须设计 token 和域名白名单。 |
| `playwright` | 本地 Node | 成功 | 搜索页截图、HTML、meta | 可直接进入主线。 |
| `crawlee` | 本地 Node | 成功 | DuckDuckGo 结果 JSON | 可直接进入主线。 |
| `camoufox` | 本地 Python / 宿主机浏览器 | 成功 | 搜索页截图、HTML、meta | 很适合作为高阻力页面兜底 worker。 |
| `ddgs` | 本地 Python | 成功 | Web 搜索结果 JSON | 可直接进入“公开搜索发现”链路。 |
| `yt-dlp` | 本地 Node / CLI | 受限 | 反机器人报错原文、状态 JSON | 可以保留，但默认要按“需要 cookie”设计。 |
| `youtube-comment-downloader` | 本地 Python | 成功 | 已知 `openclaw` 视频的 5 条评论 JSONL fallback 样例 | 很适合做公开视频评论采集，但这轮保留下来的是 fallback 证据，不是当前 query 直接命中的评论结果。 |
| `ytcog` | 本地 Node | 受限 | `sessionStatus=NOK` JSON | 不建议在无 cookie 条件下当主线。 |
| `twscrape` | 本地 Python | 受限 | 数据库迁移与 `No active accounts` 日志 | 账号到位后值得再测，现阶段不算可直接复用。 |
| `TikTokApi` | 本地 Python | 受限 | 会话创建超时日志 | 暂时只能算实验线。 |
| `praw` | 本地 Python | 受限 | `401` 文本 | 必须补 API 凭据。 |
| `Reddit public JSON` | 免部署 HTTP | 受限 | `403` 返回体片段 | 不能作为稳定主数据源。 |
| `facebook-scraper` | 本地 Python | 弱成功 / 受限 | `{}` JSON | 仅适合继续研究公开页，不适合高预期投入。 |
| `gallery-dl` | 本地 Python / CLI | 自检成功 | 版本文件、extractors 清单 | 作为媒体下载工具值得保留，但本轮没有内容级样例。 |
| `ddddocr` | 本地 Python | 成功 | 测试图、OCR 输出 | 可作为验证码 / 图像文字识别的辅助件。 |
| `amazon-review-scraper` | 本地 Python | 成功 | 评论摘要 JSON，`total_reviews=18` | Amazon 公开评论方向当前最实用。 |
| `python-amazon-paapi` | 本地 Python | 部分成功 | 导入状态 JSON | 可以保留，但要等凭据。 |
| `python-amazon-simple-product-api` | 临时 `uv` 环境 | 部分成功 | 当前环境缺失记录、临时环境导入记录 | 证明包能导入，但不建议现在就纳主线。 |
| `HackerNews/API` | 免部署 HTTP | 成功 | top story JSON | 是非常稳的北美 tech niche 数据源。 |
| `V2EX API` | 免部署 HTTP | 成功 | 热榜 JSON | 适合作为中文技术社区补充源。 |
| `MediaCrawler` | 本地仓库 + `uv` | 成功到基础运行层 | CLI help、`/api/health` JSON | 技术底座可用，真实抓取仍要等账号与授权测试。 |
| `firecrawl` | SDK + API key | 受限 | 导入成功和 key 缺失状态 | 适合增强，不适合作为当前批次主结果来源。 |

## 4. 这批软件实际能产出什么

如果从 OpenFons 后续“做报告、做网页、做视频”的视角看，这批工具已经能稳定产出以下几类证据：

1. 搜索与发现证据
   `ddgs`、`crawlee`、`playwright`、`camoufox`
2. 页面级证据
   浏览器截图、原始 HTML、URL / 标题元数据
3. 评论与社区证据
   `youtube-comment-downloader` 的 fallback 评论样例、`HackerNews/API`、`V2EX API`
4. 电商与产品证据
   `amazon-review-scraper`
5. 运行与兼容性证据
   健康检查、容器状态、包导入结果、CLI help、错误日志

这意味着第一阶段完全可以先把“采集证据层”做实，再在第二阶段把这些证据喂给你们的 `Next.js` 报告页与视频脚本生成链路。

## 5. 产物分类清单

### 5.1 `success/` 成功产物

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| [`success/amazon_review_summary.json`](artifacts/2026-03-26_redeploy_network_restored/success/amazon_review_summary.json) | JSON | Amazon 评论摘要结果，当前样例总评论数为 `18`。 |
| [`success/camoufox_search.html`](artifacts/2026-03-26_redeploy_network_restored/success/camoufox_search.html) | HTML | `camoufox` 打开的真实搜索结果页 HTML。 |
| [`success/camoufox_search.png`](artifacts/2026-03-26_redeploy_network_restored/success/camoufox_search.png) | PNG | `camoufox` 搜索结果截图。 |
| [`success/camoufox_search_meta.json`](artifacts/2026-03-26_redeploy_network_restored/success/camoufox_search_meta.json) | JSON | `camoufox` 页面 URL、标题、查询词。 |
| [`success/crawlee_ddg.json`](artifacts/2026-03-26_redeploy_network_restored/success/crawlee_ddg.json) | JSON | `crawlee` 提取的 8 条 DuckDuckGo 搜索结果。 |
| [`success/ddddocr_input_digits.png`](artifacts/2026-03-26_redeploy_network_restored/success/ddddocr_input_digits.png) | PNG | OCR 测试输入图片。 |
| [`success/ddddocr_output_digits.txt`](artifacts/2026-03-26_redeploy_network_restored/success/ddddocr_output_digits.txt) | TXT | OCR 输出文本，结果为 `1234`。 |
| [`success/ddgs_search.json`](artifacts/2026-03-26_redeploy_network_restored/success/ddgs_search.json) | JSON | `ddgs` 返回的 8 条 web 搜索结果。 |
| [`success/hackernews_topstory.json`](artifacts/2026-03-26_redeploy_network_restored/success/hackernews_topstory.json) | JSON | Hacker News 当前 top story 详情。 |
| [`success/mediacrawler_health.json`](artifacts/2026-03-26_redeploy_network_restored/success/mediacrawler_health.json) | JSON | `MediaCrawler` WebUI 健康检查。 |
| [`success/mediacrawler_help.txt`](artifacts/2026-03-26_redeploy_network_restored/success/mediacrawler_help.txt) | TXT | `MediaCrawler` CLI 帮助输出。 |
| [`success/pinchtab_health.json`](artifacts/2026-03-26_redeploy_network_restored/success/pinchtab_health.json) | JSON | `pinchtab` 容器内健康检查结果。 |
| [`success/pinchtab_snapshot.json`](artifacts/2026-03-26_redeploy_network_restored/success/pinchtab_snapshot.json) | JSON | `pinchtab snap` 快照结果。 |
| [`success/playwright_search.html`](artifacts/2026-03-26_redeploy_network_restored/success/playwright_search.html) | HTML | `playwright` 打开的真实搜索结果页 HTML。 |
| [`success/playwright_search.png`](artifacts/2026-03-26_redeploy_network_restored/success/playwright_search.png) | PNG | `playwright` 搜索结果截图。 |
| [`success/playwright_search_meta.json`](artifacts/2026-03-26_redeploy_network_restored/success/playwright_search_meta.json) | JSON | `playwright` 页面 URL、标题、查询词。 |
| [`success/v2ex_hot.json`](artifacts/2026-03-26_redeploy_network_restored/success/v2ex_hot.json) | JSON | V2EX 热榜与站点数据。 |
| [`success/youtube_comments_known_openclaw.jsonl`](artifacts/2026-03-26_redeploy_network_restored/success/youtube_comments_known_openclaw.jsonl) | JSONL | 已知 `openclaw` 相关视频的 fallback 评论样例，共 5 条，不是本轮 query 直接命中的评论结果。 |

### 5.2 `limitations/` 限制与失败证据

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| [`limitations/amazon_paapi_import.json`](artifacts/2026-03-26_redeploy_network_restored/limitations/amazon_paapi_import.json) | JSON | `amazon_paapi` 可导入，但当前无凭据。 |
| [`limitations/amazon_simple_product_api_ephemeral.json`](artifacts/2026-03-26_redeploy_network_restored/limitations/amazon_simple_product_api_ephemeral.json) | JSON | `python-amazon-simple-product-api` 在临时环境可导入。 |
| [`limitations/amazon_simple_product_api_import.json`](artifacts/2026-03-26_redeploy_network_restored/limitations/amazon_simple_product_api_import.json) | JSON | 当前正式环境未安装该包。 |
| [`limitations/facebook_page_info.json`](artifacts/2026-03-26_redeploy_network_restored/limitations/facebook_page_info.json) | JSON | 匿名公共页抓取只返回 `{}`。 |
| [`limitations/firecrawl_import.txt`](artifacts/2026-03-26_redeploy_network_restored/limitations/firecrawl_import.txt) | TXT | Firecrawl SDK 可导入的信号。 |
| [`limitations/firecrawl_status.json`](artifacts/2026-03-26_redeploy_network_restored/limitations/firecrawl_status.json) | JSON | 当前无 `FIRECRAWL_API_KEY`。 |
| [`limitations/gallery_dl_extractors.txt`](artifacts/2026-03-26_redeploy_network_restored/limitations/gallery_dl_extractors.txt) | TXT | `gallery-dl` 支持站点清单。 |
| [`limitations/gallery_dl_version.txt`](artifacts/2026-03-26_redeploy_network_restored/limitations/gallery_dl_version.txt) | TXT | `gallery-dl` 版本信息。 |
| [`limitations/pinchtab_host_health.txt`](artifacts/2026-03-26_redeploy_network_restored/limitations/pinchtab_host_health.txt) | TXT | 宿主机直连 `pinchtab` 返回 `401 unauthorized`。 |
| [`limitations/pinchtab_nav.txt`](artifacts/2026-03-26_redeploy_network_restored/limitations/pinchtab_nav.txt) | TXT | `pinchtab nav` 被 `allowedDomains` 策略拦截。 |
| [`limitations/praw_without_creds.txt`](artifacts/2026-03-26_redeploy_network_restored/limitations/praw_without_creds.txt) | TXT | `praw` 无凭据时的 `401` 结果。 |
| [`limitations/reddit_public_json.txt`](artifacts/2026-03-26_redeploy_network_restored/limitations/reddit_public_json.txt) | TXT | Reddit 公共 JSON 本轮返回 `403` 片段。 |
| [`limitations/tiktokapi_status.txt`](artifacts/2026-03-26_redeploy_network_restored/limitations/tiktokapi_status.txt) | TXT | `TikTokApi` 建立会话失败日志。 |
| [`limitations/twscrape_search.txt`](artifacts/2026-03-26_redeploy_network_restored/limitations/twscrape_search.txt) | TXT | `twscrape` 数据库迁移完成，但无可用账号。 |
| [`limitations/yt_dlp_search_raw.txt`](artifacts/2026-03-26_redeploy_network_restored/limitations/yt_dlp_search_raw.txt) | TXT | `yt-dlp` 遭遇 YouTube 反机器人校验的原始报错。 |
| [`limitations/yt_dlp_search_status.json`](artifacts/2026-03-26_redeploy_network_restored/limitations/yt_dlp_search_status.json) | JSON | `yt-dlp` 搜索状态记录。 |
| [`limitations/ytcog_search.json`](artifacts/2026-03-26_redeploy_network_restored/limitations/ytcog_search.json) | JSON | `ytcog` 搜索状态为 `NOK`。 |

### 5.3 `meta/` 元信息与环境证据

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| [`meta/docker_ps.txt`](artifacts/2026-03-26_redeploy_network_restored/meta/docker_ps.txt) | TXT | 本轮 Docker 运行状态快照。 |
| [`meta/pinchtab_container_health.json`](artifacts/2026-03-26_redeploy_network_restored/meta/pinchtab_container_health.json) | JSON | `pinchtab` 容器健康探针详情。 |
| [`meta/pinchtab_docker_logs_initial.txt`](artifacts/2026-03-26_redeploy_network_restored/meta/pinchtab_docker_logs_initial.txt) | TXT | 容器启动初始日志。 |
| [`meta/pinchtab_image_digest.json`](artifacts/2026-03-26_redeploy_network_restored/meta/pinchtab_image_digest.json) | JSON | 本轮使用镜像摘要。 |
| [`meta/smoke_node.txt`](artifacts/2026-03-26_redeploy_network_restored/meta/smoke_node.txt) | TXT | Node 依赖冒烟结果。 |
| [`meta/smoke_python.txt`](artifacts/2026-03-26_redeploy_network_restored/meta/smoke_python.txt) | TXT | Python 依赖冒烟结果。 |
| [`meta/summary.json`](artifacts/2026-03-26_redeploy_network_restored/meta/summary.json) | JSON | 这批次的汇总统计。 |
| [`meta/tool_versions.txt`](artifacts/2026-03-26_redeploy_network_restored/meta/tool_versions.txt) | TXT | `uv`、`node`、`docker` 版本。 |

## 6. 对第一阶段的实际建议

如果站在“先把采集能力做透，再承接报告页和视频内容生成”的角度，我建议这样收口：

1. 第一阶段主线就围绕已经有真实产物的工具推进。
   `ddgs`、`crawlee`、`playwright`、`camoufox`、`youtube-comment-downloader`、`amazon-review-scraper`、`HackerNews/API`、`V2EX API`
2. 第二优先级是补配置后可用的工具。
   `pinchtab`、`MediaCrawler`、`yt-dlp`、`python-amazon-paapi`
3. 需要账号和登录态的链路，等你们提供账号之后再统一打一轮授权态测试。
   `twscrape`、`TikTokApi`、`praw`、`MediaCrawler` 登录采集、可能的 `camoufox + CDP`
4. 证据模型现在可以先定下来。
   建议最少统一成 `query / source / artifact_type / collected_at / tool / status / payload_path / screenshot_path / html_path / note` 这组字段。

## 7. 这轮批次的权威路径

- Markdown 报告：`D:\demo1\openfons\labs\collector-compat\results\redeploy-deployment-report-2026-03-26.md`
- HTML 仪表板：`D:\demo1\openfons\labs\collector-compat\results\redeploy-dashboard-2026-03-26.html`
- 产物根目录：`D:\demo1\openfons\labs\collector-compat\results\artifacts\2026-03-26_redeploy_network_restored`
