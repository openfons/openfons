import type { OpportunityQuestion, StructuredIntent } from '@openfons/contracts';

const includesAny = (value: string, terms: string[]) =>
  terms.some((term) => value.toLowerCase().includes(term));

const hasMeaningfulQuestionContent = (value: string) =>
  /[\p{L}\p{N}]/u.test(value);

const AI_VENDOR_TERMS = [
  'openai',
  'openrouter',
  'anthropic',
  'claude',
  'gemini'
];

const AI_DOMAIN_TERMS = [
  'ai',
  'model',
  'llm',
  'language model',
  'language models',
  'coding agent',
  'coding agents'
];

const PROCUREMENT_TERMS = [
  'api',
  'pricing',
  'price',
  'billing',
  'vendor',
  'provider',
  'router',
  'routing',
  'direct'
];

const normalizeQuestion = (value: string) =>
  value.trim().replace(/[?!.\s]+$/g, '').trim();

export class InvalidOpportunityQuestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOpportunityQuestionError';
  }
}

export const structureIntent = (
  question: OpportunityQuestion
): StructuredIntent => {
  const raw = normalizeQuestion(question.question);
  if (!hasMeaningfulQuestionContent(raw)) {
    throw new InvalidOpportunityQuestionError(
      'Question must include at least one letter or number.'
    );
  }

  const comparison = includesAny(raw, [' vs ', 'versus', 'compare', 'or use']);
  const aiProcurement =
    includesAny(raw, AI_VENDOR_TERMS) ||
    (includesAny(raw, AI_DOMAIN_TERMS) && includesAny(raw, PROCUREMENT_TERMS));

  return {
    keywordSeed: raw,
    topic: aiProcurement ? 'AI coding model procurement' : raw,
    caseKey: aiProcurement ? 'ai-procurement' : 'general-opportunity',
    intentCandidates: comparison
      ? aiProcurement
        ? ['procurement_decision', 'routing_decision', 'comparison']
        : ['comparison', 'tool_evaluation']
      : aiProcurement
        ? ['procurement_decision', 'cost_optimization']
        : ['single_subject', 'opportunity_evaluation'],
    audienceCandidates: [
      question.audienceHint ?? (aiProcurement ? 'small AI teams' : 'general audience')
    ],
    geoCandidates: [question.geoHint ?? question.marketHint ?? 'global'],
    languageCandidates: [question.languageHint ?? 'English']
  };
};
