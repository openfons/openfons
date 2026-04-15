# Next Batch Platform Minimum Materials And Sequencing - 2026-04-14

## One-Sentence Conclusion

如果真实外部材料暂时不全，OpenFons 下一批最合理的推进方式不是“所有平台一起上”，而是按平台阻力和当前证据等级拆成两批：先处理当前正式 route 的 `youtube / tiktok / hacker-news`，同时为下一批高价值来源 `Reddit / Amazon / X` 准备最小真实材料包。

## Why This Document Exists

在已经写出：

- `docs/workbench/config-center-current-status-and-boundaries-2026-04-14.md`
- `docs/workbench/multi-platform-external-materials-matrix-2026-04-14.md`

之后，还需要一份更可执行的文档，回答下面这个问题：

> 如果现在不想空谈，也拿不出完整的全平台真实材料，下一步应该先准备哪一批平台，各自最小需要什么，顺序怎么排？

这份文档只解决“下一批怎么动”，不重新定义总架构。

## Scope Rule

本清单坚持两个边界：

1. 优先级依据以当前 SoT、当前正式 route 证据和兼容性验证结果为准。
2. 不把“历史中提到过的平台”自动视为“下一批都要一起推进”。

## Priority Model

### Batch A: Current Formal Routes

这一批的特点是：

- 已有当前仓库内正式 route
- 已有 `config-center -> preflight -> smoke harness` 接线
- 当前 blocker 主要在真实外部材料

平台：

1. `YouTube`
2. `TikTok`
3. `Hacker News`

### Batch B: High-Value Next Platforms

这一批的特点是：

- 在业务文档中价值高
- 已有实验室或兼容性验证
- 但还没有达到当前正式 smoke route 的证据等级

平台：

1. `Reddit`
2. `Amazon`
3. `X`

### Deferred Reference Track

这一批当前不适合直接进入“下一批真实闭环”：

1. `Facebook`
2. `V2EX`
3. `CN social / MediaCrawler reference track`

原因分别是：

- `Facebook` 匿名有效性较弱
- `V2EX` 是补充源，不是当前北美主源
- `CN social` 目前更像参考轨和实验室基线，不是当前商业主线最低阻力入口

## Batch A: Current Formal Routes

### A1. YouTube

#### Why It Stays In Batch A

- 当前正式 route 已存在
- 当前正式 external smoke 证据最明确
- 业务价值也高，是内容源和分发渠道双重核心

#### Minimum Real Materials

必须项：

1. `host-runtime`
   - 可执行的 `yt-dlp`
2. `network`
   - 本机可访问 YouTube

按当前 route 配置的必须项：

3. `network`
   - `global-proxy-pool` 对应的真实 proxy 配置，或者明确调整 route policy 让本轮允许无代理 smoke

可选项：

4. `session`
   - cookie / 浏览器会话
   - 仅在后续要补 `ytcog` 或更依赖登录态的能力时再考虑

#### What You Do Not Need First

第一步不需要：

- 平台账号
- 浏览器 token
- TikTok 类会话材料

#### Minimum Preparation Order

1. 安装并确认 `yt-dlp`
2. 决定本轮是否允许 YouTube 无代理 smoke
3. 如果允许无代理，则调整 route 或 policy
4. 如果不允许无代理，则先准备 `global-proxy-pool`
5. 重新跑 `doctor:crawler-runtime --route youtube`
6. 再跑 `smoke-crawler-execution --route youtube`

#### Fair Risk

YouTube 是当前最容易推进的一条正式 route，但也不能误解为“没有 proxy 一定没问题”。是否能走本机网络直连，最终要看 route policy 和当前网络条件。

### A2. TikTok

#### Why It Stays In Batch A

- 当前正式 route 已存在
- `preflight` 和 `smoke` 证据已经形成
- 但它明显属于高阻力平台

#### Minimum Real Materials

必须项：

1. `host-runtime`
   - `uv`
   - `.env_uv`
   - Python bridge 可执行链
2. `session`
   - `tiktok-cookie-main`
   - 且 cookie 里必须真实包含 `ms_token` 或 `msToken`
3. `account`
   - `tiktok-account-main.json`
4. `session`
   - `pinchtab-token`
5. `network`
   - `global-proxy-pool`

#### What You Do Not Need To Pretend

TikTok 这条线不适合再假设：

- “本机网络大概率就够”
- “没有账号也能稳定跑”
- “随便放个 placeholder cookie 先顶一下”

文档证据已经说明这类乐观假设不成立。

#### Minimum Preparation Order

1. 准备真实 `pinchtab-token`
2. 准备真实 `tiktok-account-main.json`
3. 导出真实 `tiktok-cookie-main`
4. 确认 cookie 中存在 `ms_token` / `msToken`
5. 准备真实 `global-proxy-pool`
6. 跑 `doctor:crawler-runtime --route tiktok`
7. 再跑 `smoke-crawler-execution --route tiktok`

#### Fair Risk

TikTok 不适合在“外部材料还没影子”的情况下硬推进。它应该被视为当前正式 route 中材料要求最重的一条。

## Batch B: High-Value Next Platforms

### B1. Reddit

#### Why It Is Next

- 在业务文档里属于北美核心研究源
- 但当前正式证据表明：
  - 公开 JSON 可能 `403`
  - `PRAW` 无凭据会 `401`

#### Minimum Real Materials

必须项：

1. `credentials`
   - Reddit app credentials

通常建议准备：

2. `account`
   - 一个真实可用的 Reddit 身份

可选项：

3. `network`
   - 如果当前网络环境对 Reddit 访问不稳定，再补代理

#### Minimum Preparation Order

1. 先准备 Reddit app credentials
2. 再决定是否同时准备真实账号
3. 先跑 API-first 路线
4. 只有 API-first 不稳定时，再考虑更重的浏览器或代理路径

#### Fair Risk

Reddit 不是材料最重的平台，但也绝不是“纯公开匿名即可稳定打通”的平台。

### B2. Hacker News

> 更新：`Hacker News` 已不再属于待进入正式 route 的 Batch B，而是已经提升为正式低阻力 route。下面这段材料说明保留，作为当前 route 的材料要求说明。

#### Why It Is Next

- 北美核心研究源
- 当前兼容性验证里已经有明确正向信号
- 外部材料要求最低

#### Minimum Real Materials

必须项：

1. `host-runtime`
   - 本机网络

基本不需要：

- 账号
- cookie
- proxy
- API key

#### Minimum Preparation Order

1. 直接用本机网络做真实 API 路线验证
2. 优先把它做成低阻力正式 adapter / evidence source

#### Fair Risk

这是下一批里阻力最低的平台，适合当“低成本前进项”。

### B3. Amazon

#### Why It Is Next

- 在北美内容路线里属于核心商业研究源
- 当前文档明确认为要拆成两条线：
  - API-first 商品信息
  - 公开评价 / review scraper 路线

#### Minimum Real Materials

路径 1：API-first

1. `credentials`
   - Amazon PAAPI 类凭据

路径 2：公开评论路径

1. `network`
   - 本机网络

可选项：

2. `session`
   - 如果后续公开路径受限，再考虑更重材料

#### Minimum Preparation Order

1. 先决定这批优先做 API-first 还是公开评论
2. 如果想先低成本推进，优先试公开评论路径
3. 如果要做商品信息主线，再准备正式 API 凭据

#### Fair Risk

Amazon 不是一个单路径平台。真正的最小真实材料要看你优先抓“商品信息”还是“评论”。

### B4. X

#### Why It Is Last In Batch B

- 业务价值高
- 但材料门槛明显高于 Reddit / Hacker News / Amazon
- 当前兼容性验证已经表明 `twscrape` 无账号池直接不成立

#### Minimum Real Materials

必须项：

1. `account`
   - 账号池

通常建议准备：

2. `session`
   - 会话材料
3. `network`
   - proxy / 更稳定网络条件

#### Minimum Preparation Order

1. 先不要把 X 当“低成本可先跑”的来源
2. 真要进这条线，先准备账号池
3. 再决定是否补 session 与 proxy

#### Fair Risk

X 是高价值平台，但当前不是“下一批最低阻力入口”。

## Recommended Execution Sequence

如果你的目标是“现在就能开始准备，而不是继续抽象讨论”，推荐顺序是：

1. `YouTube`
   - 因为当前正式 route 最清楚，且所需材料最少
2. `Hacker News`
   - 因为它低阻力、低材料成本，很适合快速拿到第二个正向平台
3. `Amazon`
   - 因为可拆成 API-first 与公开评论两条路线
4. `Reddit`
   - 因为价值高，但开始依赖正式凭据
5. `TikTok`
   - 因为当前正式 route 在，但材料要求明显重
6. `X`
   - 因为账号池门槛更高
7. `CN social`
   - 当前仍放在参考轨和实验室轨，不进入这一批实际落地

## If You Still Have No Real Materials Right Now

如果你此刻仍然完全拿不出真实外部材料，那么最现实的准备顺序应是：

### First Prepare

1. `YouTube`
   - 只需要先解决 `yt-dlp`
   - 再决定本轮是否允许无代理 smoke
2. `Hacker News`
   - 几乎只依赖本机网络
3. `Amazon`
   - 先选公开评论路径，而不是一上来走 API-first

### Do Not Pretend To Prepare Yet

暂时不要假装能立即推进：

1. `TikTok`
2. `X`
3. `CN social`

因为它们不属于“只靠安装工具就能往前走”的平台。

## Fair Final Recommendation

如果你的目标是：

### 目标 A：最低阻力先推进

顺序应是：

1. `YouTube`
2. `Hacker News`
3. `Amazon`

### 目标 B：对齐当前正式 route

顺序应是：

1. `YouTube`
2. `TikTok`

但这条路径要接受：TikTok 很可能因为真实 cookie / account / proxy 条件继续卡住。

### 目标 C：对齐北美内容价值

顺序应是：

1. `YouTube`
2. `Reddit`
3. `Hacker News`
4. `Amazon`

## Final Status Label

最公允的下一步状态标签是：

`prepare next-batch platform materials in layers: first formal-route blockers, then high-value low-to-mid resistance platforms`
