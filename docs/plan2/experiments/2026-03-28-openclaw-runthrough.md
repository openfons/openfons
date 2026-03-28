# 2026-03-28 OpenClaw Runthrough

Gate Status: green
Blocked By: none
Next Unblock Action: carry the winner into future report production without reopening the 10-direction pool

## 1. Frozen Input

### 1.1 Original User Seed

> 最近 OpenClaw 比较火，那它的部署是不是一个难题？我们能不能从本地部署，比如苹果电脑、Windows 电脑、Ubuntu 电脑，以及服务器、VPS 购买部署等角度切入，看看能不能通过 OpenClaw 相关部署获取流量。

### 1.2 Case-Doc Goal

把 OpenClaw 部署主题从自然语言问题收口为：

`OpportunitySpec -> Evidence Index -> EvidenceSet -> TaskSpec -> WorkflowSpec -> ReportSpec`

并验证这条链是否足够稳定，可作为未来 demo 的 showcase/control case。

### 1.3 Role Freeze

- case_role: `showcase/control case`
- non_goal: 不重新打开公司级 GTM winner 争论
- manual/runtime boundary: 本文只验证人工规划链，不假装已经存在可运行 runtime

### 1.4 Market / Language Status

- market_status: `pending_validation`
- language_status: `pending_validation`
- current evidence reality: 现有 repo-local artifact 明显偏中文 query 与中文教程结果，因此 winner 的 first execution 偏向 `zh-CN` 决策页

### 1.5 Planning Hypothesis Pool

| # | direction | keyword | status |
| --- | --- | --- | --- |
| 1 | 部署方案总对比 | `OpenClaw deployment options` | planning_hypothesis |
| 2 | 普通用户最佳方案 | `best OpenClaw setup for beginners` | planning_hypothesis |
| 3 | Mac 安装 | `OpenClaw install on macOS` | planning_hypothesis |
| 4 | Windows 安装 | `OpenClaw Windows install WSL2` | planning_hypothesis |
| 5 | Ubuntu / Linux 安装 | `OpenClaw install on Ubuntu` | planning_hypothesis |
| 6 | Docker 部署 | `OpenClaw Docker setup` | planning_hypothesis |
| 7 | VPS 选型 | `best VPS for OpenClaw` | planning_hypothesis |
| 8 | 自托管 vs 托管 | `OpenClaw self-hosted vs managed` | planning_hypothesis |
| 9 | 资源需求与成本 | `OpenClaw system requirements` | planning_hypothesis |
| 10 | 安全部署 | `OpenClaw safe deployment` | planning_hypothesis |

## 2. Evidence Basis

### 2.1 Frozen Inputs Used In This Run

1. `docs/plan2/OpenClaw部署SEO选题与报告案例.md`
2. `docs/plan2/experiments/2026-03-28-openclaw-evidence-index.md`
3. `docs/plan2/experiments/2026-03-28-openclaw-evidence-set.md`
4. `labs/collector-compat/results/artifacts/2026-03-25_openclaw_hosting/**`
5. `labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored/**`

### 2.2 Artifact Mapping Summary

| artifact | mapped use |
| --- | --- |
| `crawlee_ddg.json` | 结构化 SERP 结果，支撑 query framing |
| `playwright_search.png` / `camoufox_search.png` | 搜索截图留痕，支撑真实采集证明 |
| `yt_dlp_search.json` | 视频教程主题聚类，支撑 discovery layer |
| `youtube_comments_known_openclaw.jsonl` | 用户真实困惑语境，辅助判断是否值得写决策页 |
| `meta/summary.json` | 批次总览、限制项、query 基线 |

### 2.3 Preflight Check Readout

- Check 1 Role Freeze: pass
- Check 2 Hard Gates First: pass
- Check 3 Real Evidence Binding: pass
- Check 6 Evidence Model Alignment: pass for OpenClaw with `partial but sufficient`

## 3. Hard-Gate Review

判定口径：

- `pass`: 当前可进入次级评分
- `lab-only`: 题目本身合理，但当前实验缺少足够强的真实证据或维护约束过重
- `blocked`: 当前不应获胜

| direction | Authority | Distribution | Compliance | Maintenance Cost | status | reason |
| --- | --- | --- | --- | --- | --- | --- |
| 部署方案总对比 | pass | pass | pass | pass | pass | 官方与搜索层都能支撑 broad comparison，但页面范围偏宽 |
| 普通用户最佳方案 | pass | pass | pass | pass | pass | 决策意图强，但需要更多“谁不该上某条路径”的人工判断 |
| Mac 安装 | pass | weak | pass | pass | lab-only | 官方支持存在，但当前 repo-local 证据并不偏向 macOS 安装 |
| Windows 安装 | pass | pass | pass | pass | pass | 官方 WSL2 framing 明确，但当前 artifact 密度不如 VPS 线 |
| Ubuntu / Linux 安装 | pass | pass | pass | pass | pass | 与官方 clean install 路径一致，可作为后续技术页 |
| Docker 部署 | pass | pass | pass | pass | pass | 教程意图成立，但当前 repo-local 证据仍弱于 VPS/云端购买意图 |
| VPS 选型 | pass | pass | pass | pass | pass | 兼具 query signal、商业意图与 artifact density，是当前最稳 winner 候选 |
| 自托管 vs 托管 | weak | pass | weak | weak | blocked | 托管侧缺少清晰官方锚点，容易滑向 vendor-led 结论 |
| 资源需求与成本 | weak | pass | pass | weak | lab-only | 当前没有足够官方量化数据，不宜先写成规格页 |
| 安全部署 | weak | pass | weak | weak | lab-only | 安全 claim 对权威来源要求更高，当前 collector 产物不足 |

## 4. Secondary Scoring For Survivors

说明：以下 `1-5` 分中，`5` 表示当前实验条件下更有利于 first-page execution。

| direction | Demand | Evidence | Difficulty | Business | Updateability | total |
| --- | --- | --- | --- | --- | --- | --- |
| 部署方案总对比 | 4 | 4 | 2 | 4 | 4 | 18 |
| 普通用户最佳方案 | 4 | 3 | 3 | 4 | 3 | 17 |
| Windows 安装 | 4 | 2 | 3 | 3 | 3 | 15 |
| Ubuntu / Linux 安装 | 3 | 2 | 3 | 2 | 3 | 13 |
| Docker 部署 | 4 | 3 | 3 | 3 | 4 | 17 |
| VPS 选型 | 5 | 5 | 4 | 5 | 4 | 23 |

## 5. Winner Selection

### 5.1 Winning Direction

- winner: `best VPS for OpenClaw`
- why:
  1. 两个 repo-local artifact bundle 都围绕 VPS / 云服务器 query 展开，真实绑定最强。
  2. 商业意图和决策意图同时存在，但仍能被官方 install docs 的边界约束住，不至于直接滑成纯 affiliate 页。
  3. 页面可以收口成“该不该用 VPS、买 VPS 时看什么、什么时候别买”，这比 broad comparison 更容易形成单页 thesis。

### 5.2 Runner-Up

- runner_up: `OpenClaw deployment options`
- why_not_now:
  1. 这更像 pillar page，需要更宽的官方与社区证据池。
  2. 以当前 artifact 结构做它，人工聚合负担明显高于 VPS 单页。
  3. 它适合在 VPS 页、Windows 页、Docker 页等单页验证后再回收成总入口。

### 5.3 Hard-Gate Rejections

1. `OpenClaw self-hosted vs managed`: 当前 managed 侧缺少官方锚点，容易被 vendor-led 内容污染。
2. `OpenClaw system requirements`: 当前没有稳定的官方量化规格与 benchmark 证据。
3. `OpenClaw safe deployment`: 当前证据不足以支撑安全审计型结论。
4. `OpenClaw install on macOS`: 并非不成立，而是当前实验优先级和 artifact 密度不足。

### 5.4 Revisit Rule

- revisit_after_deeper_evidence: yes
- trigger:
  1. 补到更完整的英文 SERP / Search Console / 安装报错样本后，可重新评估 `deployment options`
  2. 补到量化资源与安全实践证据后，可解锁 `system requirements` 与 `safe deployment`

## 6. OpportunitySpec

```json
{
  "opportunitySpecVersion": "v1",
  "seed": "OpenClaw 部署流量切入",
  "topic": "OpenClaw VPS selection",
  "caseRole": "showcase_control",
  "intent": {
    "audienceCandidates": [
      "Chinese-speaking beginners",
      "solo builders",
      "small teams evaluating 24/7 deployment"
    ],
    "geoCandidates": [
      "CN",
      "SG",
      "global-zh"
    ],
    "languageCandidates": [
      "zh-CN"
    ],
    "intentCandidates": [
      "hosting_recommendation",
      "deployment_decision",
      "vps_buying_guide"
    ]
  },
  "demandResearch": {
    "geoResolution": "partial_validation_zh_market",
    "languageResolution": "zh-CN",
    "signalFamilies": [
      "search",
      "community",
      "commercial",
      "content",
      "update"
    ],
    "status": "validated_for_first_execution"
  },
  "artifactBinding": {
    "status": "bound",
    "primaryBundles": [
      "2026-03-25_openclaw_hosting",
      "2026-03-26_redeploy_network_restored"
    ]
  },
  "recommendedOpportunity": {
    "primaryKeyword": "best VPS for OpenClaw",
    "angle": "help users decide when a VPS is worth it, what baseline to buy, and which pitfalls to avoid",
    "status": "selected"
  }
}
```

## 7. TaskSpec

```json
{
  "taskId": "task_openclaw_best_vps_001",
  "intent": "hosting_recommendation",
  "profile": "seo_report_web",
  "topic": "best VPS for OpenClaw",
  "mode": "public_report",
  "audience": "Chinese-speaking beginners and solo builders",
  "geo": "CN",
  "language": "zh-CN",
  "searchIntent": "decision",
  "keywordSeed": "OpenClaw 部署流量切入",
  "keywordCluster": {
    "primary": "best VPS for OpenClaw",
    "secondary": [
      "OpenClaw VPS 推荐",
      "OpenClaw 云服务器部署",
      "OpenClaw 什么时候该上 VPS"
    ]
  },
  "trafficFit": {
    "status": "validated_for_launch",
    "reason": "Repo-local artifacts and official docs both support a VPS decision page more strongly than any other first-page candidate."
  },
  "angle": "When a VPS is worth it for OpenClaw, what baseline to buy, and when local or WSL2 is still better",
  "evidenceRequirements": [
    "official_install_docs",
    "repo_local_serp_artifacts",
    "community_or_tutorial_discovery_signals",
    "commercial_pages_as_corroboration_only"
  ],
  "sources": [
    "official_docs",
    "artifact_bundles",
    "community",
    "commercial"
  ]
}
```

## 8. WorkflowSpec

```json
{
  "sourceRouting": [
    "openclaw_official_install_docs",
    "repo_local_openclaw_artifact_bundles",
    "community_discussions",
    "commercial_vps_guides"
  ],
  "qualityGateRules": [
    "no vendor-only winner claims",
    "must keep official install boundary above commercial advice",
    "must distinguish recommendation from benchmark",
    "must state when local_or_wsl2_is_better"
  ],
  "fetchPlan": [
    {
      "step": "collect_official_deployment_boundaries",
      "goal": "freeze supported platforms, WSL2 framing, and clean Ubuntu VPS guidance"
    },
    {
      "step": "collect_repo_local_query_signals",
      "goal": "extract SERP, video, and comment evidence showing VPS decision intent"
    },
    {
      "step": "normalize_vps_decision_fields",
      "goal": "map signals into user-type, deployment-fit, and caution fields"
    },
    {
      "step": "quality_gate",
      "goal": "drop unsupported host rankings and over-precise hardware claims"
    },
    {
      "step": "build_evidence_set",
      "goal": "freeze citation-ready claims for the page"
    },
    {
      "step": "compile_report_spec",
      "goal": "prepare the report-web contract"
    }
  ]
}
```

## 9. ReportSpec

```json
{
  "templateMode": "investment_style_compare",
  "templateId": "compare_hosting_choice_v1",
  "title": "Best VPS for OpenClaw: What to Buy, What to Avoid, and When Local Setup Is Better",
  "slug": "best-vps-for-openclaw",
  "audience": "Chinese-speaking beginners and solo builders",
  "geo": "CN",
  "language": "zh-CN",
  "primaryKeyword": "best VPS for OpenClaw",
  "supportingKeywords": [
    "OpenClaw VPS 推荐",
    "OpenClaw 云服务器部署",
    "OpenClaw 本地还是 VPS"
  ],
  "trafficFitSummary": "Validated by repo-local VPS-focused artifacts plus official install boundaries.",
  "evidenceRequirements": [
    "official_install_docs",
    "repo_local_serp_artifacts",
    "community_discovery_signals"
  ],
  "sections": [
    "Quick Answer",
    "Who Actually Needs a VPS",
    "Why a Clean Ubuntu Baseline Matters",
    "What to Check Before Buying",
    "When Local or WSL2 Is Better",
    "Common Pitfalls and Non-Recommendations",
    "Evidence Appendix",
    "Update Log"
  ],
  "artifacts": [
    "nextjs_page",
    "decision_matrix",
    "faq_block",
    "schema_metadata"
  ]
}
```

## 10. Experiment Verdict

1. Stable parts:
   - 10-direction pool -> hard gates -> winner narrowing 这条人工链条是稳定的。
   - repo-local artifact bundle 可以被映射到标准化 evidence 模型，不再只是实验室杂项产物。
   - 官方 install docs 足够充当页面边界真源。
2. Heavy manual judgment:
   - 仍需人工把“VPS 搜索热度”翻译成“该写什么 page thesis”。
   - 商业页面如何降权、哪些话术不能写死，仍需要编辑判断。
3. Easy evidence:
   - SERP query capture
   - 视频教程聚类
   - 官方安装边界
4. Weak evidence:
   - 具体 VPS vendor 排名
   - 量化硬件需求
   - 安全部署审计级结论
5. Showcase/control role fit:
   - yes，OpenClaw 很适合作为控制组，因为它更依赖部署 framing、artifact binding 和官方边界，而不是价格归一化。
6. Demo readiness:
   - yes, but as a control-track seed only
   - note: 它已经足以喂给后续 demo 的 `OpportunitySpec / TaskSpec / WorkflowSpec / ReportSpec`，但不适合作为唯一商业化 winner 结论
