# 采集工具兼容性矩阵

> 状态说明
> - `未测`: 还未进行本地验证
> - `可安装`: 依赖可安装
> - `可导入`: 安装后可完成最小导入
> - `可执行`: CLI 或最小脚本可以运行
> - `可运行`: 已完成至少一次真实请求或真实能力调用
> - `需前置条件`: 需要账号、cookie、API key、浏览器或 Docker 服务
> - `不建议主线`: 即使可安装，也不建议直接作为平台主线依赖

| 工具 | 类型 | 当前状态 | 说明 |
| --- | --- | --- | --- |
| crawlee | Node SDK | 可安装 / 可导入 | `npm install` 与 Node 冒烟通过，适合多策略 worker |
| playwright | Node SDK | 可安装 / 可运行 | Chromium 已安装并完成无头启动 |
| yt-dlp-exec / yt-dlp | Node bridge / CLI | 可安装 / 可运行 | 已返回 `yt-dlp` 版本号；Windows 安装依赖 PATH 中有 `python` |
| ytcog | Node SDK | 可安装 / 可导入 / 需前置条件 | 包导入通过；当前无 cookie 会话下搜索返回 `status=NOK` |
| firecrawl | Node SDK | 可安装 / 可导入 / 需前置条件 | SDK 导入通过，真实使用需服务/API 条件 |
| pinchtab | Node SDK / Docker service | 可安装 / 可执行 / 可运行 / 需前置条件 | 本机已拉起 `pinchtab/pinchtab:latest` 官方容器并健康运行；容器内 `pinchtab health` 返回 `ok`，`pinchtab snap` 可返回 `about:blank` 快照；默认启用鉴权，外部直连 `/health` 会返回 `missing_token`，且导航受 `security.idpi.allowedDomains` 白名单限制 |
| camoufox | Python package | 可安装 / 可运行 / 不建议主线 | 已在本机真实启动 `camoufox.exe`，并成功打开 `https://example.com` 返回标题 `Example Domain`；适合作为 Playwright 高阻力站点兜底，不建议默认全站启用 |
| MediaCrawler | Repo / Python app | 可安装 / 可执行 / 可运行 / 需前置条件 / 不建议主线 | 已在 `repos/MediaCrawler` 完成 `uv sync`、`playwright install`、`main.py --help`、`--init_db sqlite` 与 WebUI `/api/health` 验证；真实抓取依赖登录态与 Playwright/CDP，且仓库声明非商业学习用途，更适合作为国内平台适配器参考与实验室基线 |
| twscrape | Python package | 可安装 / 可执行 / 需前置条件 | CLI 与数据库迁移可运行；无账号时搜索会提示 `No active accounts` |
| TikTokApi | Python package | 可安装 / 可导入 / 需前置条件 | 导入通过；当前环境下创建公开用户会话超时，需进一步处理浏览器/代理/令牌 |
| praw | Python package | 可安装 / 可导入 / 需前置条件 | 官方 API 封装可导入；无凭据时真实请求返回 401 |
| facebook-scraper | Python package | 可安装 / 可导入 / 需前置条件 | 需额外补 `lxml_html_clean` 才能通过导入；匿名公共页结果偏弱 |
| youtube-comment-downloader | Python package | 可安装 / 可执行 / 可运行 | CLI 可用，已成功抓取公开视频评论 |
| gallery-dl | Python package | 可安装 / 可执行 | CLI 版本检查通过 |
| ddgs | Python package | 可安装 / 可运行 | 已完成真实搜索并返回结果 |
| ddddocr | Python package | 可安装 / 可初始化 | OCR 对象实例化通过 |
| python-amazon-paapi | Python package | 可安装 / 可导入 / 需前置条件 | 包导入通过，真实调用需要 Amazon API 凭据 |
| python-amazon-simple-product-api | Python package | 可安装 / 可导入 / 需前置条件 | 已安装并可导入 `amazon` 命名空间，但项目较旧，需谨慎评估 |
| amazon-review-scraper | Repo / script | 可运行 | 已通过 `woot.com` 公开 AJAX 端点拿到真实 Amazon 书面评论摘要 |
| HackerNews/API | 官方 API | 可运行 | 已成功获取 `topstories` 与 `item` 详情，适合直接做 source adapter |
| V2EX API | 事实上的 JSON API | 可运行 | 已成功获取站点统计与热议主题，适合直接做 source adapter |
| Reddit public JSON | 平台端点 | 受限 / 不稳定 | 当前环境重复请求返回 403，说明公开端点也可能受反爬限制 |
