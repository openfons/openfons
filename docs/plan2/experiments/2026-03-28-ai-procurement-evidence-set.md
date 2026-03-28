# 2026-03-28 AI Procurement EvidenceSet

Gate Status: green
Blocked By: none
Next Unblock Action: keep all future comparison claims inside the frozen cohort and normalization frame

## Selected Direction

- page_keyword: `direct API vs OpenRouter`
- page_angle: 回答 AI coding 团队“什么时候该直连，什么时候该用 router”
- evidence_scope: 只保留当前单页 winner 所需 claim，不扩展到全球全量 provider 排名

## Frozen Normalization Frame

1. `base_input_price`
2. `base_output_price`
3. `cached_input_price`
4. `tool_call_or_extra_cost`
5. `region_availability`
6. `billing_notes`
7. `source_timestamp`

## Evidence Items

### AP-CLAIM-001

- claim_id: AP-CLAIM-001
- claim: `direct API vs OpenRouter` 这类页面不能只比 token 单价，因为 OpenAI、Gemini、DeepSeek 都把缓存、工具/grounding、tier 或 billing 约束暴露为真实采购变量。
- artifact_refs:
  - docs/plan2/experiments/captures/2026-03-28-openai-pricing-note.md
  - docs/plan2/experiments/captures/2026-03-28-gemini-pricing-note.md
  - docs/plan2/experiments/captures/2026-03-28-deepseek-pricing-note.md
- normalized_fields:
  - base_input_price
  - base_output_price
  - cached_input_price
  - tool_call_or_extra_cost
  - source_timestamp
- supporting_sources:
  - AP-OFF-001
  - AP-OFF-002
  - AP-OFF-003
  - AP-DOC-001
  - AP-DOC-002
  - AP-REG-004
- source_weight: official-primary
- freshness_note: 四个 direct/provider-side capture 全部在 2026-03-28 冻结。
- caveat: 这些来源支撑的是采购框架，不是完整的模型能力排名。

### AP-CLAIM-002

- claim_id: AP-CLAIM-002
- claim: OpenRouter 不应被写成“永远更便宜”的默认答案，因为其推理价格虽然 pass-through，但 credit purchase 与 BYOK 都存在平台级费用。
- artifact_refs:
  - docs/plan2/experiments/captures/2026-03-28-openrouter-pricing-note.md
- normalized_fields:
  - base_input_price
  - base_output_price
  - billing_notes
  - source_timestamp
- supporting_sources:
  - AP-RTR-001
  - AP-RTR-002
- source_weight: official-primary
- freshness_note: OpenRouter fee structure 直接来自官方 pricing/FAQ 页面。
- caveat: 实际总成本还会受充值频率、BYOK 是否启用、模型组合与请求量影响。

### AP-CLAIM-003

- claim_id: AP-CLAIM-003
- claim: OpenRouter 仍然可能比直连更实用，因为它把 provider routing、fallback、provider ordering、ZDR 约束和 price-weighted routing 整合进统一接口。
- artifact_refs:
  - docs/plan2/experiments/captures/2026-03-28-openrouter-pricing-note.md
- normalized_fields:
  - billing_notes
  - region_availability
  - source_timestamp
- supporting_sources:
  - AP-RTR-002
  - AP-RTR-003
- source_weight: official-primary
- freshness_note: 这些 router-specific 字段与平台费用一样，都属于 2026-03-28 的当前平台说明。
- caveat: 该 claim 证明的是治理与韧性价值，不等于任何具体团队都该用 router。

### AP-CLAIM-004

- claim_id: AP-CLAIM-004
- claim: `region_availability` 必须作为固定比较字段，因为 OpenAI 和 Gemini 都公开列出地区可用性，而 DeepSeek 则体现为注册/支付约束而非公开国家矩阵。
- artifact_refs:
  - docs/plan2/experiments/captures/2026-03-28-openai-pricing-note.md
  - docs/plan2/experiments/captures/2026-03-28-gemini-pricing-note.md
  - docs/plan2/experiments/captures/2026-03-28-deepseek-pricing-note.md
- normalized_fields:
  - region_availability
  - billing_notes
  - source_timestamp
- supporting_sources:
  - AP-REG-001
  - AP-REG-002
  - AP-REG-003
  - AP-REG-004
- source_weight: official-primary
- freshness_note: 各 provider 的区域/采购可达性都属于高波动字段，本轮已带访问日期冻结。
- caveat: DeepSeek 当前缺少显式 supported-country matrix，因此这里的 region note 更偏 procurement caveat，而不是正式区域列表。

### AP-CLAIM-005

- claim_id: AP-CLAIM-005
- claim: 在当前实验里，`direct API vs OpenRouter` 比 `AI coding model procurement options` 或 `best AI model provider by country` 更适合作为 first-page winner，因为它能在小 cohort 下保持清晰 source hierarchy 与强决策意图。
- artifact_refs:
  - docs/plan2/experiments/captures/2026-03-28-openai-pricing-note.md
  - docs/plan2/experiments/captures/2026-03-28-openrouter-pricing-note.md
- normalized_fields:
  - base_input_price
  - base_output_price
  - region_availability
  - billing_notes
  - source_timestamp
- supporting_sources:
  - AP-OFF-001
  - AP-OFF-002
  - AP-OFF-003
  - AP-RTR-001
  - AP-RTR-003
- source_weight: official-primary with runthrough synthesis
- freshness_note: 该结论依赖本轮 frozen cohort 和 capture completeness，不是对长期站点结构的终局判断。
- caveat: 如果后续补齐更多 provider captures，pillar page 和 hidden-cost page 的优先级可能上升。

### AP-CLAIM-006

- claim_id: AP-CLAIM-006
- claim: 当前 procurement capture set 对 compare page 已达 `partial but sufficient`，足以支撑 direct-vs-router 决策页，但不足以支撑“全球最佳供应商”或“全国家地区最佳购买路径”这种更宽页面。
- artifact_refs:
  - docs/plan2/experiments/captures/2026-03-28-openai-pricing-note.md
  - docs/plan2/experiments/captures/2026-03-28-gemini-pricing-note.md
  - docs/plan2/experiments/captures/2026-03-28-deepseek-pricing-note.md
  - docs/plan2/experiments/captures/2026-03-28-openrouter-pricing-note.md
- normalized_fields:
  - base_input_price
  - base_output_price
  - cached_input_price
  - tool_call_or_extra_cost
  - region_availability
  - billing_notes
  - source_timestamp
- supporting_sources:
  - AP-COM-001
  - AP-COM-002
  - AP-DIS-001
  - AP-DIS-002
- source_weight: official-primary, community/discovery-only secondary
- freshness_note: discovery-only 与社区来源只用于校验市场问题是否真实存在，不进入最终价格结论。
- caveat: 当前仍缺少真实 usage-bill sample、team routing config capture、以及更多 direct provider cohort entries。

## EvidenceSet Verdict

1. direct-vs-router 页面已经具备 claim-ready evidence objects。
2. 当前最稳的 page thesis 不是“哪家绝对最便宜”，而是“哪种采购路径更适合哪类团队”。
3. 该 `EvidenceSet` 依赖的人工归一化步骤包括：
   - 将官方 pricing 页面压缩到统一 7 字段 frame
   - 将 OpenRouter 的 router 能力与 fee 结构分拆成不同 procurement variables
   - 将社区/媒体来源严格降级为 corroboration 或 discovery-only
4. collector / capture 映射状态: `partial but sufficient`
