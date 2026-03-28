# 2026-03-28 AI Procurement Evidence Index

Gate Status: green
Blocked By: none
Next Unblock Action: keep the first page constrained to `direct API vs OpenRouter` with the frozen cohort below

## Track Role

- case_role: `beachhead candidate`
- current selected direction target: `direct API vs OpenRouter`
- runner-up target: `hidden costs of ai coding models`
- access baseline: `2026-03-28`

## Frozen Minimum Capture Shape

每个 repo-local capture example 至少包含：

- capture_id
- source_url
- captured_on
- repo_local_artifact_path
- artifact_type: `html_snapshot / screenshot / text_capture / normalized_note`
- normalization_note
- comparison_fields_supported

本轮 AI procurement 采用 `normalized_note` 作为最小 capture 形状。

## Official Provider Pricing Pages

### Entry AP-OFF-001

- source_type: official
- title: Pricing | OpenAI API
- url: https://platform.openai.com/docs/pricing
- accessed_on: 2026-03-28
- use_as: primary
- note: 支撑 OpenAI 的 `base_input_price / cached_input_price / tool_call_or_extra_cost`。

### Entry AP-OFF-002

- source_type: official
- title: Gemini Developer API pricing
- url: https://ai.google.dev/gemini-api/docs/pricing
- accessed_on: 2026-03-28
- use_as: primary
- note: 支撑 Gemini 的 input/output、context caching、grounding 成本字段。

### Entry AP-OFF-003

- source_type: official
- title: Models & Pricing | DeepSeek API Docs
- url: https://api-docs.deepseek.com/quick_start/pricing
- accessed_on: 2026-03-28
- use_as: primary
- note: 支撑 DeepSeek 的 cache hit / miss 与 output 价格字段。

## Official Provider Region / Availability Pages

### Entry AP-REG-001

- source_type: official
- title: Supported countries and territories | OpenAI API
- url: https://platform.openai.com/docs/supported-countries
- accessed_on: 2026-03-28
- use_as: primary
- note: 支撑 OpenAI 的 `region_availability` 字段。

### Entry AP-REG-002

- source_type: official
- title: Data controls in the OpenAI platform
- url: https://platform.openai.com/docs/models/how-we-use-your-data
- accessed_on: 2026-03-28
- use_as: corroboration
- note: 支撑 OpenAI 的区域处理、数据驻留端点与相关 billing/compliance 说明。

### Entry AP-REG-003

- source_type: official
- title: Available regions for Google AI Studio and Gemini API
- url: https://ai.google.dev/gemini-api/docs/available-regions
- accessed_on: 2026-03-28
- use_as: primary
- note: 支撑 Gemini 的可用地区与 “否则转向 Vertex AI” 的边界。

### Entry AP-REG-004

- source_type: official
- title: FAQ | DeepSeek API Docs
- url: https://api-docs.deepseek.com/faq
- accessed_on: 2026-03-28
- use_as: corroboration
- note: 支撑 DeepSeek 的注册邮箱约束、充值方式与退款/余额规则。

## Official Routing-Platform Pricing Pages

### Entry AP-RTR-001

- source_type: official
- title: Pricing | OpenRouter
- url: https://openrouter.ai/pricing
- accessed_on: 2026-03-28
- use_as: primary
- note: 支撑 OpenRouter 的 plan、BYOK 阈值与 credit fee 入口说明。

### Entry AP-RTR-002

- source_type: official
- title: OpenRouter FAQ
- url: https://openrouter.ai/docs/faq
- accessed_on: 2026-03-28
- use_as: primary
- note: 支撑 “pass-through inference pricing、credit purchase fee、BYOK fee” 这些 billing notes。

### Entry AP-RTR-003

- source_type: official
- title: Provider Routing | OpenRouter Documentation
- url: https://openrouter.ai/docs/features/provider-routing
- accessed_on: 2026-03-28
- use_as: primary
- note: 支撑 routing、fallback、provider ordering、ZDR 等 router 独有字段。

## Official Docs About Caching, Rate Limits, Tool Calls, Or Billing Notes

### Entry AP-DOC-001

- source_type: official
- title: Billing | Gemini API
- url: https://ai.google.dev/gemini-api/docs/billing
- accessed_on: 2026-03-28
- use_as: corroboration
- note: 支撑 Gemini 的 paid tier、usage monitoring 与计费术语。

### Entry AP-DOC-002

- source_type: official
- title: Context caching | Gemini API
- url: https://ai.google.dev/gemini-api/docs/caching
- accessed_on: 2026-03-28
- use_as: corroboration
- note: 支撑 Gemini 的缓存额外成本与 cache semantics。

### Entry AP-DOC-003

- source_type: official
- title: Your First API Call | DeepSeek API Docs
- url: https://api-docs.deepseek.com/
- accessed_on: 2026-03-28
- use_as: corroboration
- note: 支撑 DeepSeek 的 base URL、模型版本与 OpenAI-compatible API framing。

## Community Corroboration

### Entry AP-COM-001

- source_type: community
- title: Gemini 2.5 Model Bug Causing Massive Bills, Google Support Unresponsive to Core Issue
- url: https://discuss.ai.google.dev/t/gemini-2-5-model-bug-causing-massive-bills-google-support-unresponsive-to-core-issue/91841
- accessed_on: 2026-03-28
- use_as: corroboration
- note: 用于证明社区真实关心 hidden billing behavior，但不替代官方 pricing/billing 真源。

### Entry AP-COM-002

- source_type: community
- title: Is OpenRouter a better option than OpenAI?
- url: https://www.reddit.com/r/openrouter/comments/1rin3bt/is_openrouter_a_better_option_than_openai/
- accessed_on: 2026-03-28
- use_as: corroboration
- note: 用于观察真实采购纠结点，例如 tooling、直连 vs router 的取舍。

## Discovery-Only

### Entry AP-DIS-001

- source_type: discovery-only
- title: AI Model Pricing 2026: Compare GPT, Claude, Gemini | OpenMark
- url: https://openmark.ai/ai-pricing
- accessed_on: 2026-03-28
- use_as: discovery-only
- note: 可用于发现市场如何讲述价格对比，但不能替代官方定价页。

### Entry AP-DIS-002

- source_type: discovery-only
- title: AI API Pricing Comparison 2026 | Burnwise
- url: https://www.burnwise.io/blog/ai-api-pricing-comparison-2026
- accessed_on: 2026-03-28
- use_as: discovery-only
- note: 可用于发现常见 comparison framing，但不能作为最终数字真源。

## Artifact Binding

### Binding AP-ART-001

- capture_id: ai-proc-openai-pricing-20260328
- source_url: https://platform.openai.com/docs/pricing
- captured_on: 2026-03-28
- repo_local_artifact_path: docs/plan2/experiments/captures/2026-03-28-openai-pricing-note.md
- artifact_type: normalized_note
- normalization_note: 把 OpenAI pricing、supported countries、data controls 压缩到 procurement frame。
- comparison_fields_supported:
  - base_input_price
  - base_output_price
  - cached_input_price
  - tool_call_or_extra_cost
  - region_availability
  - billing_notes
  - source_timestamp

### Binding AP-ART-002

- capture_id: ai-proc-gemini-pricing-20260328
- source_url: https://ai.google.dev/gemini-api/docs/pricing
- captured_on: 2026-03-28
- repo_local_artifact_path: docs/plan2/experiments/captures/2026-03-28-gemini-pricing-note.md
- artifact_type: normalized_note
- normalization_note: 把 Gemini pricing、available regions、billing、caching 压缩到 procurement frame。
- comparison_fields_supported:
  - base_input_price
  - base_output_price
  - cached_input_price
  - tool_call_or_extra_cost
  - region_availability
  - billing_notes
  - source_timestamp

### Binding AP-ART-003

- capture_id: ai-proc-deepseek-pricing-20260328
- source_url: https://api-docs.deepseek.com/quick_start/pricing
- captured_on: 2026-03-28
- repo_local_artifact_path: docs/plan2/experiments/captures/2026-03-28-deepseek-pricing-note.md
- artifact_type: normalized_note
- normalization_note: 把 DeepSeek pricing 与 FAQ 压缩到 procurement frame，特别保留 cache hit / miss 与充值规则。
- comparison_fields_supported:
  - base_input_price
  - base_output_price
  - cached_input_price
  - tool_call_or_extra_cost
  - region_availability
  - billing_notes
  - source_timestamp

### Binding AP-ART-004

- capture_id: ai-proc-openrouter-pricing-20260328
- source_url: https://openrouter.ai/pricing
- captured_on: 2026-03-28
- repo_local_artifact_path: docs/plan2/experiments/captures/2026-03-28-openrouter-pricing-note.md
- artifact_type: normalized_note
- normalization_note: 把 OpenRouter pricing、FAQ 与 provider routing 文档压缩到 procurement frame。
- comparison_fields_supported:
  - base_input_price
  - base_output_price
  - cached_input_price
  - tool_call_or_extra_cost
  - region_availability
  - billing_notes
  - source_timestamp

## Index Conclusion

1. 当前 procurement 线已经具备 repo-local capture example，不再停留在纯口头规划。
2. `direct API vs OpenRouter` 是最适合 first execution 的单页方向，因为它有清晰官方真源、清晰 cohort，以及强决策意图。
3. `best AI model provider by country`、`pricing tracker` 这类方向当前维护成本过高，不宜先做。
4. 当前 collector/capture 映射状态: `partial but sufficient`
