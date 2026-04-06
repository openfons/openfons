import type {
  CompilationPolicyCode,
  OpportunitySpec
} from '@openfons/contracts';

export type AiProcurementFamily =
  | 'vendor-choice'
  | 'pricing-access'
  | 'capability-procurement';

export type AiProcurementPolicyResult =
  | { supported: true; family: AiProcurementFamily }
  | { supported: false; reason: CompilationPolicyCode };

const DOMAIN_TERMS = [
  'ai',
  'model',
  'llm',
  'openai',
  'openrouter',
  'gemini',
  'anthropic',
  'api'
] as const;

const PRICING_TERMS = [
  'pricing',
  'price',
  'billing',
  'credit',
  'credits',
  'cost'
] as const;

const CAPABILITY_TERMS = [
  'availability',
  'region',
  'regional',
  'supported countries',
  'supported territories',
  'rate limit',
  'rate limits',
  'throughput',
  'access'
] as const;

const BUYER_DECISION_TERMS = [
  'vs',
  'versus',
  'compare',
  'comparison',
  'vendor',
  'provider',
  'router',
  'routing',
  'direct',
  'pricing',
  'billing',
  'availability',
  'rate limit',
  'access',
  'plan',
  'plans'
] as const;

const hasAnyTerm = (haystack: string, terms: readonly string[]) =>
  terms.some((term) => haystack.includes(term));

export const classifyAiProcurementOpportunity = (
  opportunity: OpportunitySpec
): AiProcurementPolicyResult => {
  const haystack = [
    opportunity.title,
    opportunity.input.query,
    opportunity.input.problem,
    opportunity.input.outcome
  ]
    .join(' ')
    .toLowerCase();

  if (!hasAnyTerm(haystack, DOMAIN_TERMS)) {
    return { supported: false, reason: 'out_of_scope_domain' };
  }

  if (!hasAnyTerm(haystack, BUYER_DECISION_TERMS)) {
    return { supported: false, reason: 'underspecified_buyer_decision' };
  }

  if (hasAnyTerm(haystack, PRICING_TERMS)) {
    return { supported: true, family: 'pricing-access' };
  }

  if (hasAnyTerm(haystack, CAPABILITY_TERMS)) {
    return { supported: true, family: 'capability-procurement' };
  }

  return { supported: true, family: 'vendor-choice' };
};

export const formatAiProcurementPolicyMessage = (
  result: Extract<AiProcurementPolicyResult, { supported: false }>
) => {
  switch (result.reason) {
    case 'out_of_scope_domain':
      return 'Only bounded AI procurement decisions are supported in the current compile path.';
    case 'underspecified_buyer_decision':
      return 'The request must express a concrete AI procurement decision such as vendor choice, pricing access, or capability access.';
    case 'missing_official_targets':
      return 'The current AI procurement compile path could not identify official vendor targets for this request.';
    case 'insufficient_public_evidence':
      return 'The current AI procurement compile path does not have enough public evidence for this request.';
    case 'needs_authenticated_capture':
      return 'This AI procurement request needs authenticated capture that is outside the current public run boundary.';
  }
};
