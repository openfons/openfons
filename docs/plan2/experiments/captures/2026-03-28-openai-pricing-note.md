# 2026-03-28 OpenAI Pricing Capture Note

- capture_id: ai-proc-openai-pricing-20260328
- source_url: https://platform.openai.com/docs/pricing
- captured_on: 2026-03-28
- repo_local_artifact_path: docs/plan2/experiments/captures/2026-03-28-openai-pricing-note.md
- artifact_type: normalized_note
- normalization_note: 基于 OpenAI 官方 pricing、supported countries 与 data controls 文档，抽取 direct API vs router 决策所需字段。
- comparison_fields_supported:
  - base_input_price
  - base_output_price
  - cached_input_price
  - tool_call_or_extra_cost
  - region_availability
  - billing_notes
  - source_timestamp

## Supporting URLs

1. https://platform.openai.com/docs/pricing
2. https://platform.openai.com/docs/supported-countries
3. https://platform.openai.com/docs/models/how-we-use-your-data

## Observed Fields

- source_timestamp: 2026-03-28
- example_model: `gpt-5.1`
- base_input_price: `$1.25 / 1M tokens`
- base_output_price: `$10.00 / 1M tokens`
- cached_input_price: `$0.125 / 1M tokens`
- tool_call_or_extra_cost:
  - `Web search`: `$10 / 1k calls` + search content tokens at model input rates
  - `File search storage`: `$0.10 / GB-day`
  - `Responses API file search tool call`: `$2.50 / 1k calls`
- region_availability:
  - OpenAI API access is limited to a published supported-country list
  - regional data residency endpoints are documented for US, Europe, Australia, Canada, Japan, India, Singapore, South Korea, United Kingdom, United Arab Emirates
- billing_notes:
  - usage tier affects rate limits
  - regional processing endpoints can carry a 10% uplift for some model families

## Capture Use

该 note 主要支撑：

1. direct provider 的官方价格字段足够完整
2. direct provider 的额外费用并不只体现在 token 单价
3. `region_availability` 在 OpenAI 上是显式采购字段，而不是隐含背景
