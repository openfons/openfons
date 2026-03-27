# AI Coding Model Procurement Options

> 主题：AI procurement
> 批次：第一批
> 页面角色：`pillar / 总入口页`
> 优先级：`P0`

## 1. 页面定位

这页是 AI procurement 主题的总入口页。

它不是静态价目表，而是采购判断总览页，回答：

`AI coding / agent 团队到底有哪些主流采购路径，以及不同路径各自适合什么场景`

## 2. 目标用户与市场

当前工作假设：

1. `Audience`
   solo developers, small AI teams, technical buyers
2. `Geo`
   `US`
3. `Language`
   `en`
4. `Search Intent`
   `procurement decision + comparison`

## 3. Query Ownership

### 3.1 Primary Keyword

`AI coding model procurement options`

### 3.2 Supporting Keywords

1. `how to buy AI coding models`
2. `best procurement path for coding agents`
3. `single provider vs multi provider llm buying`
4. `best way to buy models for AI teams`

### 3.3 This Page Owns

1. procurement overview
2. purchase path comparison
3. all-options decision map

### 3.4 This Page Should Not Own

1. direct API vs router deep comparison
2. cheapest usable model decision
3. provider-specific benchmarking

## 4. 核心 Thesis

`Model procurement is not a price-table problem; it is a purchase-path and total-cost-of-ownership decision.`

## 5. 必须证明的关键判断

1. 官方直连、多家直连、路由平台、中转路径分别适合什么团队
2. 采购路径差异不只来自单价，还来自缓存、工具调用、治理和失败成本
3. 采购总览页必须回答“怎么选”，而不是只抄价格

## 6. 证据要求

### 6.1 Primary

1. 官方定价页
2. 官方 API / 计费说明
3. 官方地区可用性说明

### 6.2 Secondary

1. 官方 changelog
2. 官方工具调用、缓存、rate-limit 说明

### 6.3 Corroboration

1. GitHub issues
2. community usage reports
3. developer procurement discussions

## 7. 页面结构建议

1. `Quick Answer`
2. `Executive Summary`
3. `Procurement Path Decision Map`
4. `Single Direct vs Multi Direct vs Router Comparison`
5. `Total Cost Framework`
6. `Which Path Fits Which Team`
7. `Evidence Appendix`
8. `Update Log`

## 8. 商业化路径

1. `consulting lead`
2. `tool / comparator upsell`
3. `subscription database / tracker`

## 9. 更新触发器

1. 官方定价变化
2. 路由规则变化
3. 平台计费口径变化
4. 地区可用性变化

## 10. Launch Brief

| 项目 | 内容 |
| --- | --- |
| `Goal` | 建立采购判断主题的总入口与方法论锚点 |
| `Launch Batch` | 第一批 |
| `Title Candidate` | `AI Coding Model Procurement Options: What Small Teams Should Compare First` |
| `Slug` | `ai-coding-model-procurement-options` |
| `Primary CTA` | 继续查看“cheap model”决策页和“direct API vs OpenRouter”比较页 |
| `Success Signal` | 承接 broad procurement query 并建立整个主题的权威基线 |
| `Open Risk` | 如果页面退化成静态总表，会失去差异化 |

## 11. ReportSpec

```json
{
  "templateMode": "investment_style_portfolio",
  "templateId": "procurement_options_pillar_v1",
  "title": "AI Coding Model Procurement Options: What Small Teams Should Compare First",
  "slug": "ai-coding-model-procurement-options",
  "audience": "solo developers, small AI teams, technical buyers",
  "geo": "US",
  "language": "en",
  "primaryKeyword": "AI coding model procurement options",
  "supportingKeywords": [
    "how to buy AI coding models",
    "best procurement path for coding agents",
    "single provider vs multi provider llm buying",
    "best way to buy models for AI teams"
  ],
  "trafficFitSummary": "A pillar page for procurement-path decisions, positioned above cheaper model and direct-vs-router comparison pages.",
  "evidenceRequirements": [
    "official_pricing_pages",
    "official_cost_policy_docs",
    "official_region_docs",
    "community_corroboration"
  ],
  "sections": [
    "Quick Answer",
    "Executive Summary",
    "Procurement Decision Map",
    "Purchase Path Comparison",
    "Total Cost Framework",
    "Team-Type Recommendation",
    "Evidence Appendix",
    "Update Log"
  ],
  "artifacts": [
    "nextjs_page",
    "decision_map",
    "comparison_matrix",
    "schema_metadata"
  ]
}
```
