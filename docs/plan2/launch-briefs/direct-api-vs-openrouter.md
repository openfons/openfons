# Direct API vs OpenRouter

> 主题：AI procurement
> 批次：第一批
> 页面角色：`高争议比较页`
> 优先级：`P0`

## 1. 页面定位

这页是第一批中最强的比较页。

它要回答的不是“哪个更好”，而是：

`什么时候直连官方 API 更优，什么时候通过 OpenRouter 更实际`

## 2. 目标用户与市场

当前工作假设：

1. `Audience`
   small AI teams, technical buyers, advanced solo developers
2. `Geo`
   `US`
3. `Language`
   `en`
4. `Search Intent`
   `comparison + procurement decision`

## 3. Query Ownership

### 3.1 Primary Keyword

`direct API vs OpenRouter`

### 3.2 Supporting Keywords

1. `official API vs relay for coding agents`
2. `should my team buy direct or use a router`
3. `OpenRouter vs direct API pricing`

### 3.3 This Page Owns

1. direct vs router comparison
2. purchase-control vs convenience tradeoff
3. team-level route selection

### 3.4 This Page Should Not Own

1. full procurement overview
2. cheapest usable model recommendation
3. platform-specific router benchmark pages

## 4. 核心 Thesis

`Routing convenience and direct-purchase control win under different team conditions, so the right answer depends on governance, failure tolerance, and stack complexity.`

## 5. 必须证明的关键判断

1. 官方直连和路由平台的核心差异不只在价格
2. 便利性、治理、限速、失败回退、模型覆盖都会改变真实选择
3. 团队条件不同，推荐路径就不同
4. 比较必须防止“只看 headline pricing”的误导

## 6. 证据要求

### 6.1 Primary

1. 官方 provider 定价页
2. OpenRouter 官方定价与路由说明
3. 官方限速、访问层级或计费说明

### 6.2 Secondary

1. 官方 changelog
2. 官方使用限制或政策更新

### 6.3 Corroboration

1. 社区团队使用经验
2. 真实采购与使用反馈

## 7. 页面结构建议

1. `Quick Answer`
2. `Executive Summary`
3. `Where Direct API Wins`
4. `Where OpenRouter Wins`
5. `Hidden Costs and Governance Tradeoffs`
6. `Decision Tree by Team Type`
7. `Evidence Appendix`
8. `Update Log`

## 8. 商业化路径

1. `consulting lead`
2. `procurement tool upsell`
3. `comparison subscription hint`

## 9. 更新触发器

1. 官方定价变化
2. OpenRouter 路由或计费变化
3. provider access policy 变化
4. 团队使用案例与社区观点变化

## 10. Launch Brief

| 项目 | 内容 |
| --- | --- |
| `Goal` | 抓取高争议比较意图与高转化决策流量 |
| `Launch Batch` | 第一批 |
| `Title Candidate` | `Direct API vs OpenRouter for AI Coding Teams` |
| `Slug` | `direct-api-vs-openrouter-ai-coding` |
| `Primary CTA` | 查看采购总览页；进入 budget 决策页 |
| `Success Signal` | 承接强比较 query，并形成较强咨询或工具延展信号 |
| `Open Risk` | 如果没有把“价格 vs 总拥有成本”分清，会导致结论失真 |

## 11. ReportSpec

```json
{
  "templateMode": "investment_style_compare",
  "templateId": "direct_vs_router_compare_v1",
  "title": "Direct API vs OpenRouter for AI Coding Teams",
  "slug": "direct-api-vs-openrouter-ai-coding",
  "audience": "small AI teams, technical buyers, advanced solo developers",
  "geo": "US",
  "language": "en",
  "primaryKeyword": "direct API vs OpenRouter",
  "supportingKeywords": [
    "official API vs relay for coding agents",
    "should my team buy direct or use a router",
    "OpenRouter vs direct API pricing"
  ],
  "trafficFitSummary": "A high-controversy comparison page built to capture direct-vs-router procurement intent for AI coding teams.",
  "evidenceRequirements": [
    "official_provider_pricing_docs",
    "official_relay_pricing_docs",
    "official_routing_docs",
    "community_usage_examples"
  ],
  "sections": [
    "Quick Answer",
    "Executive Summary",
    "Where Direct API Wins",
    "Where OpenRouter Wins",
    "Hidden Costs and Tradeoffs",
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
