# 2026-03-28 Gemini Pricing Capture Note

- capture_id: ai-proc-gemini-pricing-20260328
- source_url: https://ai.google.dev/gemini-api/docs/pricing
- captured_on: 2026-03-28
- repo_local_artifact_path: docs/plan2/experiments/captures/2026-03-28-gemini-pricing-note.md
- artifact_type: normalized_note
- normalization_note: 基于 Gemini 官方 pricing、available regions、billing 与 caching 文档，抽取 direct API vs router 所需字段。
- comparison_fields_supported:
  - base_input_price
  - base_output_price
  - cached_input_price
  - tool_call_or_extra_cost
  - region_availability
  - billing_notes
  - source_timestamp

## Supporting URLs

1. https://ai.google.dev/gemini-api/docs/pricing
2. https://ai.google.dev/gemini-api/docs/available-regions
3. https://ai.google.dev/gemini-api/docs/billing
4. https://ai.google.dev/gemini-api/docs/caching

## Observed Fields

- source_timestamp: 2026-03-28
- example_model: `gemini-2.5-flash-preview-09-2025`
- base_input_price: `$0.30 / 1M tokens` for text/image/video
- base_output_price: `$2.50 / 1M tokens`
- cached_input_price:
  - `$0.03 / 1M tokens` for text/image/video
  - `$1.00 / 1,000,000 tokens per hour` storage price
- tool_call_or_extra_cost:
  - `Grounding with Google Search`: `1,500 RPD free`, then `$35 / 1,000 grounded prompts`
  - some variants also list Google Maps grounding charges
- region_availability:
  - Gemini API and Google AI Studio publish an explicit available-country list
  - if unavailable in-region, Google points users to Vertex AI
- billing_notes:
  - paid tier unlocks higher rate limits and context caching
  - Batch API can reduce cost by 50% relative to standard paid tier

## Capture Use

该 note 主要支撑：

1. Gemini 的“缓存 + grounding + tier”结构天然要求固定 normalization frame
2. 采购判断不能只看 input/output token 单价
3. available regions 是显式的采购可达性约束
