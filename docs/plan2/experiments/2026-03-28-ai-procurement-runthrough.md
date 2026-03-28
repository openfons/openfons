# 2026-03-28 AI Procurement Runthrough

Gate Status: green
Blocked By: none
Next Unblock Action: use the frozen cohort below as the only valid scope for the first compare page

## 1. Frozen Input

### 1.1 Original User Seed

> 现在是 AI 编程、agent 时代，tokens 消耗巨大，用户需要一个既聪明、还便宜的模型供应商。到底应该买哪一家，还是多家一起买，还是通过中转？能不能调研全球大模型价格对比，也比较一些知名第三方中转，并考虑多语言和不同国家的结构？

### 1.2 Case-Doc Goal

把 AI coding / agent 时代的模型采购问题收口为：

`OpportunitySpec -> Evidence Index -> EvidenceSet -> TaskSpec -> WorkflowSpec -> ReportSpec`

并验证它是否仍是 OpenFons 当前最强的 beachhead candidate。

### 1.3 Role Freeze

- case_role: `beachhead candidate`
- non_goal: 不重新打开 GTM from scratch
- execution focus: 压测 procurement compare page 的可执行性，而不是建立全球静态价目表

### 1.4 Audience / Geography / Language Status

- audience_status: `pending_validation`
- geography_status: `pending_validation`
- language_status: `pending_validation`
- current execution choice: first-page winner 收口到 `US / en`，因为 frozen keyword、官方 docs 与 routing terminology 都以英文为主

### 1.5 Planning Hypothesis Pool

| # | direction | keyword | status |
| --- | --- | --- | --- |
| 1 | 采购方案总对比 | `AI coding model procurement options` | planning_hypothesis |
| 2 | 便宜但够用的 coding model | `best cheap model for coding agents` | planning_hypothesis |
| 3 | 直连 vs 中转 | `direct API vs OpenRouter` | planning_hypothesis |
| 4 | 单供应商 vs 多供应商 | `single vs multi provider llm stack` | planning_hypothesis |
| 5 | 隐藏成本 | `hidden costs of ai coding models` | planning_hypothesis |
| 6 | 国家地区选择 | `best AI model provider in [country]` | planning_hypothesis |
| 7 | 多语言能力对比 | `best multilingual model for coding teams` | planning_hypothesis |
| 8 | 平台路径对比 | `OpenRouter vs Requesty vs Together API` | planning_hypothesis |
| 9 | 工具栈定制页 | `best model for Cursor Cline Roo Code` | planning_hypothesis |
| 10 | 价格更新追踪 | `llm pricing change tracker` | planning_hypothesis |

## 2. Evidence Basis And Capture Setup

### 2.1 Minimal Capture Shape

每个 procurement capture example 统一采用：

- capture_id
- source_url
- captured_on
- repo_local_artifact_path
- artifact_type
- normalization_note
- comparison_fields_supported

### 2.2 Capture Examples Created For This Run

1. `docs/plan2/experiments/captures/2026-03-28-openai-pricing-note.md`
2. `docs/plan2/experiments/captures/2026-03-28-gemini-pricing-note.md`
3. `docs/plan2/experiments/captures/2026-03-28-deepseek-pricing-note.md`
4. `docs/plan2/experiments/captures/2026-03-28-openrouter-pricing-note.md`

### 2.3 Preflight Check Readout

- Check 1 Role Freeze: pass
- Check 2 Hard Gates First: pass
- Check 3 Real Evidence Binding: pass
- Check 4 Procurement Comparison Discipline: pass
- Check 6 Evidence Model Alignment: pass for procurement with `partial but sufficient`

## 3. Hard-Gate Review

| direction | Authority | Distribution | Compliance | Maintenance Cost | status | reason |
| --- | --- | --- | --- | --- | --- | --- |
| 采购方案总对比 | pass | pass | pass | pass | pass | 官方定价与平台文档足够多，但页面范围偏宽 |
| 便宜但够用的 coding model | weak | pass | pass | weak | lab-only | 需要把价格与能力 floor 一起比较，当前缺少 benchmark/capability 层 |
| 直连 vs 中转 | pass | pass | pass | pass | pass | 采购问题明确、官方真源足够、cohort 可控 |
| 单供应商 vs 多供应商 | pass | pass | pass | pass | pass | 团队采购意图真实，但仍需要更多治理与故障切换案例 |
| 隐藏成本 | pass | pass | pass | pass | pass | 官方定价页已暴露足够多隐藏变量，可作为强候选 |
| 国家地区选择 | pass | pass | weak | weak | blocked | geo/compliance 变量太多，当前不适合 first page |
| 多语言能力对比 | weak | pass | pass | weak | lab-only | 需要独立质量评测和语言任务定义，当前 source set 不足 |
| 平台路径对比 | pass | pass | pass | weak | lab-only | Requesty / Together / OpenRouter 混合比较会把比较类目拉宽 |
| 工具栈定制页 | weak | pass | pass | weak | lab-only | 缺少 Cursor/Cline/Roo Code 实际适配 capture |
| 价格更新追踪 | pass | pass | pass | weak | blocked | 维护成本过高，不适合作为 first execution |

## 4. Secondary Scoring For Survivors

说明：以下 `1-5` 分中，`5` 表示当前实验条件下更有利于 first-page execution。

| direction | Demand | Evidence | Difficulty | Business | Updateability | total |
| --- | --- | --- | --- | --- | --- | --- |
| 采购方案总对比 | 4 | 4 | 2 | 4 | 4 | 18 |
| 直连 vs 中转 | 5 | 5 | 4 | 5 | 4 | 23 |
| 单供应商 vs 多供应商 | 4 | 4 | 3 | 5 | 4 | 20 |
| 隐藏成本 | 4 | 5 | 3 | 4 | 4 | 20 |

## 5. Winner Selection

### 5.1 Winning Direction

- winner: `direct API vs OpenRouter`
- why:
  1. 比较对象最清晰，且可以被官方 pricing/routing 文档直接锚定。
  2. 该方向天然要求固定 `normalization frame`，最能压测 OpenFons 的 evidence model。
  3. 它回答的是一个真实 recurring procurement decision，而不是广义“看价格表”。

### 5.2 Runner-Up

- runner_up: `hidden costs of ai coding models`
- why_not_now:
  1. 它与当前 normalization frame 高度兼容，但 page thesis 更偏 editorial synthesis，单页 query clarity 稍弱于 direct-vs-router。
  2. 作为第二页更合适，可在 first compare page 稳住后复用 capture 与字段。

### 5.3 Hard-Gate Rejections

1. `best AI model provider in [country]`: 当前太依赖 geo/compliance 细节，先不做。
2. `llm pricing change tracker`: 更新负担高，不宜作为 first page。
3. `best multilingual model for coding teams`: 当前缺少任务定义与多语言质量证据。
4. `best model for Cursor Cline Roo Code`: 当前没有足够 tool-stack capture。

## 6. Cohort Freeze

### 6.1 Chosen Page Direction

- page_direction: `direct API vs OpenRouter`

### 6.2 Exact Providers / Platforms Included

1. `OpenAI API`
2. `Gemini API`
3. `DeepSeek API`
4. `OpenRouter`

### 6.3 Why These Entries Are In Scope

1. 都有公开官方 pricing 或 routing 文档。
2. 都与 AI coding / agent 场景的真实采购讨论高度相关。
3. 三个 direct providers + 一个 router 足以形成“直连 vs 中转”的最小合理 cohort。

### 6.4 Obvious Exclusions

1. `Anthropic direct API`
2. `Requesty`
3. `Together AI`
4. `Groq`
5. `Alibaba Cloud Model Studio`
6. 国家地区 reseller、代充或 subscription-only 前台产品

### 6.5 Why They Are Excluded For First Execution

1. 会让 compare class 从“direct vs router”膨胀成“所有 provider / router / inference platform 大混战”。
2. 当前 frozen capture set 已能支撑最小比较闭环，没有必要先做更宽 cohort。
3. 第一页更需要 crisp decision page，而不是 exhaustiveness。

### 6.6 Future Cohort Expansion Rule

只有同时满足以下条件，才允许新增 entry：

1. 有公开官方 pricing / routing / billing 真源。
2. 能完整填入当前 7 字段 normalization frame。
3. 与 AI coding / agent 团队采购决策直接相关。

## 7. Fixed Normalization Frame

1. `base_input_price`
   direct call 的标准输入价格。
2. `base_output_price`
   标准输出价格。
3. `cached_input_price`
   官方显式缓存或 cache-hit 价格；若无则记为未公开。
4. `tool_call_or_extra_cost`
   grounding、web search、tool calls、credit fee 等额外项。
5. `region_availability`
   官方国家列表、区域处理、或注册/付款可达性说明。
6. `billing_notes`
   tier、充值、退款、BYOK、rate limits、routing fee 等规则。
7. `source_timestamp`
   当前来源的访问日期。

## 8. OpportunitySpec

```json
{
  "opportunitySpecVersion": "v1",
  "seed": "AI coding / agent 模型采购比较",
  "topic": "direct API vs OpenRouter for AI coding teams",
  "caseRole": "beachhead_candidate",
  "intent": {
    "intentCandidates": [
      "procurement_decision",
      "routing_decision",
      "cost_normalization"
    ],
    "audienceCandidates": [
      "small AI teams",
      "technical buyers",
      "engineering managers"
    ],
    "geoCandidates": [
      "US"
    ],
    "languageCandidates": [
      "en"
    ]
  },
  "demandResearch": {
    "geoResolution": "US",
    "languageResolution": "en",
    "signalFamilies": [
      "search",
      "community",
      "commercial",
      "content",
      "update"
    ],
    "status": "validated_for_first_execution"
  },
  "cohortFreeze": {
    "included": [
      "OpenAI API",
      "Gemini API",
      "DeepSeek API",
      "OpenRouter"
    ],
    "status": "frozen"
  },
  "recommendedOpportunity": {
    "primaryKeyword": "direct API vs OpenRouter",
    "angle": "show when direct provider access is cheaper or simpler, and when routing is worth the extra layer",
    "status": "selected"
  }
}
```

## 9. TaskSpec

```json
{
  "taskId": "task_direct_vs_openrouter_001",
  "intent": "procurement_decision",
  "profile": "seo_report_web",
  "topic": "direct API vs OpenRouter for AI coding teams",
  "mode": "public_report",
  "audience": "small AI teams",
  "geo": "US",
  "language": "en",
  "searchIntent": "comparison",
  "keywordSeed": "AI coding / agent 模型采购比较",
  "keywordCluster": {
    "primary": "direct API vs OpenRouter",
    "secondary": [
      "official API vs router for coding agents",
      "should my team buy direct or use OpenRouter",
      "OpenRouter vs direct API pricing"
    ]
  },
  "trafficFit": {
    "status": "validated_for_launch",
    "reason": "This page answers a repeat procurement decision with clear official sources, fixed fields, and strong business intent."
  },
  "angle": "When direct API is cheaper or cleaner, and when OpenRouter is worth the extra layer",
  "evidenceRequirements": [
    "official_provider_pricing_docs",
    "official_router_pricing_docs",
    "official_routing_docs",
    "repo_local_normalized_capture_notes"
  ],
  "sources": [
    "official_docs",
    "artifact_captures",
    "community_corroboration"
  ]
}
```

## 10. WorkflowSpec

```json
{
  "sourceRouting": [
    "official_provider_pricing_pages",
    "official_provider_region_pages",
    "official_router_pricing_pages",
    "official_router_routing_docs",
    "repo_local_capture_notes"
  ],
  "qualityGateRules": [
    "no conclusion based only on discovery-only comparison blogs",
    "must keep the frozen cohort unchanged",
    "must distinguish pass-through token pricing from platform fees",
    "must separate route-quality benefits from raw cost claims"
  ],
  "fetchPlan": [
    {
      "step": "collect_official_pricing_and_region_docs",
      "goal": "freeze current official source set with timestamps"
    },
    {
      "step": "normalize_provider_and_router_fields",
      "goal": "map all sources into the fixed 7-field frame"
    },
    {
      "step": "collect_router_capability_notes",
      "goal": "extract fallback, ordering, and data-control mechanics"
    },
    {
      "step": "quality_gate",
      "goal": "drop unsupported 'cheapest overall' or 'best everywhere' claims"
    },
    {
      "step": "build_evidence_set",
      "goal": "freeze citation-ready comparison claims"
    },
    {
      "step": "compile_report_spec",
      "goal": "prepare the report-web contract"
    }
  ]
}
```

## 11. ReportSpec

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
    "official API vs router for coding agents",
    "should my team buy direct or use OpenRouter",
    "OpenRouter vs direct API pricing"
  ],
  "trafficFitSummary": "Validated with a frozen four-entry cohort and official pricing/routing docs.",
  "evidenceRequirements": [
    "official_provider_pricing_docs",
    "official_router_pricing_docs",
    "repo_local_capture_notes"
  ],
  "sections": [
    "Quick Answer",
    "Executive Summary",
    "Where Direct API Wins",
    "Where OpenRouter Wins",
    "Hidden Costs and Billing Notes",
    "Geography and Availability Constraints",
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

## 12. Experiment Verdict

1. Source weighting stayed clear:
   - yes
   - official pricing / routing docs 已经能够充当主真源，社区与比较博客只做 secondary/discovery。
2. Normalization fields were sufficient:
   - yes for the first compare page
   - no for a full global market map or quality ranking
3. Where manual judgment still dominated:
   - cohort freeze
   - obvious exclusions
   - direct API vs router 的“哪类团队更适合哪条路径”解释
4. Beachhead fit:
   - yes
   - 这条线比 OpenClaw 更直接连接采购、降本、迁移和团队治理需求
5. Demo seed readiness:
   - yes, with one caution
   - caution: 当前 capture 创建仍然是人工归一化，不是自动抓取与标准化
