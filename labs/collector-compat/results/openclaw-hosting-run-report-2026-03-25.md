# OpenClaw 关键词运行产物盘点

> 批次日期：2026-03-25
> 查询词：`openclaw 最合适的服务器虚拟主机`
> 产物目录：`labs/collector-compat/results/artifacts/2026-03-25_openclaw_hosting`
> 本轮共落盘文件：39 个
> 其中 `success/` 24 个，`limitations/` 15 个

## 1. 本轮怎么执行

这次不是只看“包能不能装”，而是把我们目前纳入 OpenFons 视野的开源项目重新执行一轮，并把实际产物保存下来。

执行原则：

1. 能直接公开跑出内容结果的，优先保存真实内容产物。
2. 需要账号、cookie、API key、token、白名单或浏览器安全策略的，也保存真实错误或限制信号。
3. 如果原始查询在某一平台没有结果，会保留“原始查询无结果”的产物；只有在确实需要演示该工具产物形态时，才额外保留透明 fallback。

## 2. 逐项盘点

| 项目 | 本轮状态 | 本轮产物 | 主要产物文件 | 说明 |
| --- | --- | --- | --- | --- |
| `crawlee` | 成功 | DuckDuckGo 搜索结果提取 JSON | `artifacts/2026-03-25_openclaw_hosting/success/crawlee_ddg.json` | 用 `CheerioCrawler` 抓取并提取了 8 条搜索结果，说明轻量 HTML worker 链路可用。 |
| `playwright` | 成功 | 搜索结果页截图、HTML、meta | `artifacts/2026-03-25_openclaw_hosting/success/playwright_search.png` | 以原始查询打开 DuckDuckGo 并成功保存页面截图与 HTML，说明标准浏览器自动化链路可用。 |
| `yt-dlp-exec / yt-dlp` | 成功 | YouTube 搜索元数据 JSON | `artifacts/2026-03-25_openclaw_hosting/success/yt_dlp_search.json` | 修正 UTF-8 后，原始查询直接返回 5 条 YouTube 结果，第一条视频 ID 为 `NLFBCsniFas`。 |
| `ytcog` | 受限 | 搜索状态 JSON | `artifacts/2026-03-25_openclaw_hosting/limitations/ytcog_search.json` | `sessionStatus=NOK`，结果数为 0，说明它仍依赖更稳定的 cookie / session 条件。 |
| `firecrawl` | 受限 | 导入成功信号、API key 状态 | `artifacts/2026-03-25_openclaw_hosting/limitations/firecrawl_status.json` | SDK 可导入，但当前没有 `FIRECRAWL_API_KEY`，所以本轮只能确认“可接线”，不能确认抓取能力。 |
| `pinchtab` | 部分成功 | Docker 服务健康检查、快照、宿主机访问限制 | `artifacts/2026-03-25_openclaw_hosting/success/pinchtab_health.json` | 官方 Docker 容器健康运行，容器内 `health` / `snap` 正常；宿主机直连返回 `401`，导航又被 `allowedDomains` 拦下。 |
| `camoufox` | 成功 | 搜索结果页截图、HTML、meta | `artifacts/2026-03-25_openclaw_hosting/success/camoufox_search.png` | 以原始查询真实打开 DuckDuckGo 并保存页面产物，说明宿主机集成链路已经能产生真实网页产物。 |
| `twscrape` | 受限 | CLI 日志 | `artifacts/2026-03-25_openclaw_hosting/limitations/twscrape_search.txt` | CLI 能跑，数据库迁移也正常，但日志明确给出 `No active accounts`。 |
| `TikTokApi` | 受限 | 会话创建失败日志 | `artifacts/2026-03-25_openclaw_hosting/limitations/tiktokapi_status.txt` | 当前环境创建最小会话仍超时，说明 TikTok 线还没到可直接产出内容的阶段。 |
| `praw` | 受限 | 无凭据错误文本 | `artifacts/2026-03-25_openclaw_hosting/limitations/praw_without_creds.txt` | 真实请求返回 `401`，说明 Reddit 官方 API 线必须补凭据。 |
| `facebook-scraper` | 弱成功 / 受限 | 公共页信息 JSON | `artifacts/2026-03-25_openclaw_hosting/limitations/facebook_page_info.json` | 本轮返回 `{}`，说明匿名公共页抓取有效字段仍然偏弱。 |
| `youtube-comment-downloader` | 成功 | 评论 JSONL、抓取日志 | `artifacts/2026-03-25_openclaw_hosting/success/youtube_comments_exact_query.jsonl` | 对原始查询第一条视频抓到了 5 条评论；另外还保留了 `openclaw` fallback 的 11 条评论文件。 |
| `gallery-dl` | 自检成功 | CLI 版本与支持站点清单 | `artifacts/2026-03-25_openclaw_hosting/limitations/gallery_dl_version.txt` | 本轮确认 CLI 可用，但没有把原始查询映射到合适的媒体源 URL，所以没有内容级下载产物。 |
| `ddgs` | 成功 | Web 搜索结果 JSON | `artifacts/2026-03-25_openclaw_hosting/success/ddgs_search.json` | 对原始查询返回了 8 条搜索结果，是这轮最稳的公开搜索产物之一。 |
| `ddddocr` | 成功 | 生成测试图与 OCR 文本 | `artifacts/2026-03-25_openclaw_hosting/success/ddddocr_input_digits.png` | 生成了一个 `1234` 的测试图，OCR 输出文件成功识别为 `1234`。 |
| `python-amazon-paapi` | 部分成功 | 导入状态 JSON | `artifacts/2026-03-25_openclaw_hosting/limitations/amazon_paapi_import.json` | 包可导入，但当前没有 Amazon API 凭据，因此不能产生商品级内容产物。 |
| `python-amazon-simple-product-api` | 部分成功 | 当前环境缺失与临时环境导入结果 | `artifacts/2026-03-25_openclaw_hosting/limitations/amazon_simple_product_api_ephemeral.json` | 当前实验环境未安装，但通过 `uv run --with ...` 的临时环境可以导入，说明“包本身能用、当前环境未纳入”。 |
| `amazon-review-scraper` | 成功 | 评论摘要 JSON | `artifacts/2026-03-25_openclaw_hosting/success/amazon_review_summary.json` | 本轮仍成功拿到 100 条评论汇总级产物，是 Amazon 方向目前最明确的公开产物。 |
| `HackerNews/API` | 成功 | top story JSON | `artifacts/2026-03-25_openclaw_hosting/success/hackernews_topstory.json` | 成功保存了当前第一条热门帖详情，说明官方 API 线很稳。 |
| `V2EX API` | 成功 | 站点统计与热榜 JSON | `artifacts/2026-03-25_openclaw_hosting/success/v2ex_hot.json` | 成功保存了站点统计与前 10 条热榜主题。 |
| `Reddit public JSON` | 成功但有波动 | 热帖 JSON 文本 | `artifacts/2026-03-25_openclaw_hosting/limitations/reddit_public_json.txt` | 这次真实返回 `200`，与前一轮的 `403` 相比说明该端点存在环境或时段波动，不能视为稳定来源。 |
| `MediaCrawler` | 部分成功 | CLI 帮助、WebUI 健康检查 | `artifacts/2026-03-25_openclaw_hosting/success/mediacrawler_help.txt` | 主入口和 WebUI 健康检查都正常，但本轮仍未进入带登录态的真实抓取。 |

## 3. 关键观察

1. 以 `openclaw 最合适的服务器虚拟主机` 为关键词，已经能稳定产生真实内容产物的主力链路是：`ddgs`、`crawlee`、`playwright`、`camoufox`、`yt-dlp`、`youtube-comment-downloader`。
2. YouTube 这条线在修正编码后明显变强：原始查询直接出了 5 条视频结果，评论抓取也能对第一条结果落盘。
3. 浏览器层现在已经出现两条可用路线：
   `playwright` 适合作为默认浏览器 worker。
   `camoufox` 适合作为高阻力兜底浏览器。
4. `pinchtab` 的 Docker 化已经是“能跑”的，不再是概念验证；但它默认安全边界很强，后续接入必须处理 token 和 `allowedDomains`。
5. 需要账号或凭据的项目，本轮都已经把真实阻塞点保存成产物了：
   `twscrape` 卡在账号池。
   `TikTokApi` 卡在会话创建。
   `praw` 卡在 Reddit 凭据。
   `firecrawl` 卡在 API key。
6. `Reddit public JSON` 本轮返回 `200` 而不是上一轮的 `403`，说明它不是绝对不可用，而是环境波动较大，不适合直接高估稳定性。
7. `MediaCrawler` 现在更像“国内平台采集工程底座已经装好”，但还没进入真正的账号登录与内容抓取阶段。

## 4. 这批产物对 OpenFons 的意义

从这轮落盘结果看，OpenFons 第一阶段已经可以明确分成三层：

1. `可直接进内容验证闭环`
   `ddgs`、`crawlee`、`playwright`、`camoufox`、`yt-dlp`、`youtube-comment-downloader`、`amazon-review-scraper`、`HackerNews/API`、`V2EX API`
2. `可接线但要补安全/配置`
   `pinchtab`、`firecrawl`、`python-amazon-paapi`
3. `必须补账号/凭据/登录态后再谈`
   `twscrape`、`TikTokApi`、`praw`、`MediaCrawler`

对后续最有价值的动作是：

1. 把 `pinchtab` 的 token 与域名白名单配置化。
2. 继续把 `MediaCrawler + Camoufox / CDP` 联调成真实登录态链路。
3. 以这次已经落盘的搜索、视频、评论、截图产物为基础，开始定义 OpenFons 的标准化证据模型。
