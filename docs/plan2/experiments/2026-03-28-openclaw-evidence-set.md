# 2026-03-28 OpenClaw EvidenceSet

Gate Status: green
Blocked By: none
Next Unblock Action: feed these claims into the later `best VPS for OpenClaw` page brief without widening back to all 10 directions

## Selected Direction

- page_keyword: `best VPS for OpenClaw`
- page_angle: 为中文用户回答“什么时候应该上 VPS、应该怎么买、哪些做法要避免”
- evidence_scope: 只保留能直接支撑这张单页的 claim，不承载完整 portfolio 讨论

## Evidence Items

### OCL-CLAIM-001

- claim_id: OCL-CLAIM-001
- claim: 当前 repo-local 证据最强地指向 `VPS / 云服务器` 这一类 OpenClaw 部署查询，因此首个执行角度应优先选择 VPS 选型页，而不是平台安装页。
- artifact_refs:
  - labs/collector-compat/results/artifacts/2026-03-25_openclaw_hosting/success/crawlee_ddg.json
  - labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored/success/playwright_search.png
  - labs/collector-compat/results/artifacts/2026-03-25_openclaw_hosting/success/yt_dlp_search.json
- supporting_sources:
  - OC-DIS-001
  - OC-DIS-002
  - OC-DIS-003
- source_weight: artifact-first with discovery-only corroboration
- freshness_note: 两个 artifact bundle 均来自 2026-03-25 / 2026-03-26 的真实复跑，接近当前实验日期。
- caveat: 这些证据更适合证明 query framing 与需求方向，不足以直接证明具体哪家主机商最好。

### OCL-CLAIM-002

- claim_id: OCL-CLAIM-002
- claim: OpenClaw 官方安装链天然支持多平台与多安装路径，但对 Windows 优先 WSL2、对 VPS/cloud hosts 优先干净 Ubuntu LTS 自行安装的 framing 足以作为 VPS 页面主轴。
- artifact_refs:
  - labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored/meta/summary.json
  - labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored/success/ddgs_search.json
- supporting_sources:
  - OC-OFF-001
  - OC-REP-001
- source_weight: official-primary
- freshness_note: 官方 install docs 于 2026-03-28 访问校验，适合作为本轮最强真源。
- caveat: 本 claim 支撑的是安装边界与页面 framing，不等于官方直接给出“最佳 VPS 厂商推荐”。

### OCL-CLAIM-003

- claim_id: OCL-CLAIM-003
- claim: 对 OpenClaw 而言，VPS 页最适合写成“是否该用 VPS、买 VPS 时看什么、何时本地更优”的决策页，而不是 vendor 排名页。
- artifact_refs:
  - labs/collector-compat/results/artifacts/2026-03-25_openclaw_hosting/success/yt_dlp_search.json
  - labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored/success/crawlee_ddg.json
- supporting_sources:
  - OC-BIZ-001
  - OC-BIZ-002
  - OC-MTH-001
- source_weight: mixed, with official methodology over commercial interpretation
- freshness_note: 商业来源可以帮助识别用户提问方式，但最终结论仍回到官方安装边界和 helpful-content 约束。
- caveat: 目前没有 repo-local benchmark 或 host-level uptime 数据，不能产出硬件性能排行榜式结论。

### OCL-CLAIM-004

- claim_id: OCL-CLAIM-004
- claim: `OpenClaw deployment options` 是合理的 runner-up pillar，但以当前 artifact 密度看，它比 VPS 单页更宽、更依赖人工编辑聚合，因此不适合作为 first execution angle。
- artifact_refs:
  - labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored/meta/summary.json
  - labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored/success/camoufox_search_meta.json
- supporting_sources:
  - OC-OFF-001
  - OC-DIS-001
  - OC-MTH-002
- source_weight: artifact-led with official corroboration
- freshness_note: 这一判断直接反映当前实验素材结构，而不是长期内容策略的最终答案。
- caveat: 若后续补到更多英文 SERP、平台安装与 Docker 专向 artifact，pillar page 的优先级可能上升。

### OCL-CLAIM-005

- claim_id: OCL-CLAIM-005
- claim: 当前 OpenClaw 采集产物对 `best VPS for OpenClaw` 已达 `partial but sufficient`，足以产出建议型页面 brief，但仍不足以支撑 `system requirements` 或 `safe deployment` 这种需要更强量化和安全证据的页面。
- artifact_refs:
  - labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored/meta/summary.json
  - labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored/limitations/yt_dlp_search_status.json
  - labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored/limitations/pinchtab_nav.txt
- supporting_sources:
  - OC-OFF-001
  - OC-COM-001
  - OC-BIZ-003
- source_weight: artifact-primary with mixed corroboration
- freshness_note: 限制项是当前实验的一部分，不能只记录成功结果。
- caveat: 这说明页面适合写成 recommendation / tradeoff 页，不适合写成 benchmark / security audit 页。

## EvidenceSet Verdict

1. `best VPS for OpenClaw` 已经具备单页级 claim 集合，可进入结构化 spec。
2. 当前最可靠的 page promise 是“帮用户判断该不该上 VPS，以及买 VPS 时看什么”，而不是“替用户宣布唯一最佳供应商”。
3. 该 `EvidenceSet` 明确依赖人工归一化步骤：
   - 将 DuckDuckGo redirect URL 还原为真实目标 URL
   - 将视频与评论结果降级为 discovery-only
   - 将官方 install docs 抽象成页面边界规则，而不是直接复制教程
4. collector 产物映射状态: `partial but sufficient`
