# 2026-03-28 DeepSeek Pricing Capture Note

- capture_id: ai-proc-deepseek-pricing-20260328
- source_url: https://api-docs.deepseek.com/quick_start/pricing
- captured_on: 2026-03-28
- repo_local_artifact_path: docs/plan2/experiments/captures/2026-03-28-deepseek-pricing-note.md
- artifact_type: normalized_note
- normalization_note: 基于 DeepSeek 官方 pricing 与 FAQ，抽取 cache hit / miss、billing 与可注册性约束。
- comparison_fields_supported:
  - base_input_price
  - base_output_price
  - cached_input_price
  - tool_call_or_extra_cost
  - region_availability
  - billing_notes
  - source_timestamp

## Supporting URLs

1. https://api-docs.deepseek.com/quick_start/pricing
2. https://api-docs.deepseek.com/faq
3. https://api-docs.deepseek.com/

## Observed Fields

- source_timestamp: 2026-03-28
- example_model: `deepseek-chat` / `deepseek-reasoner` on `DeepSeek-V3.2`
- base_input_price: `$0.28 / 1M tokens` (`cache miss` as direct comparable input price)
- base_output_price: `$0.42 / 1M tokens`
- cached_input_price: `$0.028 / 1M tokens` (`cache hit`)
- tool_call_or_extra_cost:
  - tool calls are supported
  - current pricing page does not publish a separate tool-call surcharge
- region_availability:
  - current official docs do not publish a full supported-country matrix
  - FAQ notes that some email domains are not supported for registration
- billing_notes:
  - charges are deducted from topped-up balance or granted balance
  - top-up methods include PayPal, bank card, Alipay, and WeChat Pay
  - product prices may vary and should be re-checked on the pricing page

## Capture Use

该 note 主要支撑：

1. DeepSeek 的 cache hit / miss 结构与其他 provider 不同，必须显式归一化
2. DeepSeek 的可采购性更像“注册与付款约束”，而不是公开国家列表
3. direct provider 的 billing mechanics 不能被压扁成一个单价字段
