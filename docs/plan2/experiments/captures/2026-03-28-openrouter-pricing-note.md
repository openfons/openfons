# 2026-03-28 OpenRouter Pricing Capture Note

- capture_id: ai-proc-openrouter-pricing-20260328
- source_url: https://openrouter.ai/pricing
- captured_on: 2026-03-28
- repo_local_artifact_path: docs/plan2/experiments/captures/2026-03-28-openrouter-pricing-note.md
- artifact_type: normalized_note
- normalization_note: 基于 OpenRouter 官方 pricing、FAQ 与 provider-routing 文档，抽取 router path 的费用与运营字段。
- comparison_fields_supported:
  - base_input_price
  - base_output_price
  - cached_input_price
  - tool_call_or_extra_cost
  - region_availability
  - billing_notes
  - source_timestamp

## Supporting URLs

1. https://openrouter.ai/pricing
2. https://openrouter.ai/docs/faq
3. https://openrouter.ai/docs/features/provider-routing

## Observed Fields

- source_timestamp: 2026-03-28
- base_input_price: `provider/model dependent; OpenRouter states inference pricing is passed through from underlying providers`
- base_output_price: `provider/model dependent`
- cached_input_price: `provider/model dependent; not exposed as a single platform-wide field`
- tool_call_or_extra_cost:
  - purchasing credits carries a `5.5%` fee with `$0.80` minimum
  - BYOK: first `1M requests/month` free, then `5%` fee
- region_availability:
  - provider routing docs mention `EU in-region routing` for enterprise customers
  - actual availability still depends on chosen providers and routing rules
- billing_notes:
  - default routing is price-weighted with uptime-aware fallback
  - provider ordering, fallbacks, ZDR constraints, and parameter requirements are configurable

## Capture Use

该 note 主要支撑：

1. OpenRouter 不是“统一 token 单价”产品，而是 pass-through + routing + account-fee 组合
2. `direct API vs OpenRouter` 的核心不是谁永远更便宜，而是谁在何种采购场景更合适
3. router path 的实际价值必须把 fallback、provider controls、latency / uptime 也纳入 billing notes
