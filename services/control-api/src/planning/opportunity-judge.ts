import type {
  OpportunityInput,
  OpportunityOption,
  PlanningRoleBrief,
  StructuredIntent
} from '@openfons/contracts';

const normalizeQuestion = (value: string) =>
  value.trim().replace(/[?!.\s]+$/g, '').trim();

const toTitle = (value: string) => {
  const normalized = normalizeQuestion(value);

  if (!normalized) {
    return 'Planned Opportunity';
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const detectAiEntities = (seed: string) => {
  const haystack = seed.toLowerCase();
  return [
    { label: 'OpenAI', match: /\bopenai\b/ },
    { label: 'OpenRouter', match: /\bopenrouter\b/ },
    { label: 'Anthropic', match: /\banthropic\b|\bclaude\b/ },
    { label: 'Gemini', match: /\bgemini\b/ }
  ]
    .filter((item) => item.match.test(haystack))
    .map((item) => item.label);
};

const buildAiKeyword = (entities: string[]) => {
  if (entities.length >= 2) {
    return `${entities[0]} Direct API vs ${entities[1]}`;
  }

  if (entities[0] === 'OpenRouter') {
    return 'Direct API vs OpenRouter';
  }

  return 'Direct API vs Router';
};

export const judgeOpportunity = ({
  intent,
  roleBriefs
}: {
  intent: StructuredIntent;
  roleBriefs: PlanningRoleBrief[];
}): {
  option: OpportunityOption;
  input: OpportunityInput;
  judgeBrief: PlanningRoleBrief;
} => {
  const aiProcurement = intent.caseKey === 'ai-procurement';

  if (aiProcurement) {
    const entities = detectAiEntities(intent.keywordSeed);
    const primaryKeyword = buildAiKeyword(entities);
    const title = entities.includes('OpenRouter')
      ? `${primaryKeyword} for AI Coding Teams`
      : 'Direct API vs Router for AI Coding Teams';

    const option: OpportunityOption = {
      id: 'option_direct_api_vs_router',
      primaryKeyword,
      angle: 'official direct purchase versus routing platform tradeoff',
      audience: intent.audienceCandidates[0],
      geo: intent.geoCandidates[0],
      language: intent.languageCandidates[0],
      searchIntent: 'comparison',
      rationale:
        'This is a bounded procurement decision with clear evidence needs.',
      riskNotes: [
        'Official pricing, routing, and region sources must be captured.'
      ]
    };

    const judgeBrief: PlanningRoleBrief = {
      role: 'opportunity-judge',
      summary: `Select ${option.primaryKeyword} as the first confirmation option.`,
      confidence: 'medium',
      keyFindings: roleBriefs.flatMap((brief) => brief.keyFindings).slice(0, 4),
      openQuestions: ['Confirm this page angle before running compile.'],
      signalFamilies: ['search', 'commercial', 'content']
    };

    return {
      option,
      judgeBrief,
      input: {
        title,
        query: option.primaryKeyword,
        market: intent.geoCandidates[0],
        audience: option.audience,
        problem:
          'Teams need to choose between direct model APIs and routing providers.',
        outcome: 'Produce a source-backed comparison report.',
        geo: option.geo,
        language: option.language
      }
    };
  }

  const primaryKeyword = normalizeQuestion(intent.keywordSeed);
  const title = toTitle(primaryKeyword);
  const searchIntent = intent.intentCandidates.includes('comparison')
    ? 'comparison'
    : 'evaluation';
  const option: OpportunityOption = {
    id: 'option_primary_question',
    primaryKeyword,
    angle: 'keep the first page aligned to the user question',
    audience: intent.audienceCandidates[0],
    geo: intent.geoCandidates[0],
    language: intent.languageCandidates[0],
    searchIntent,
    rationale: 'Do not rewrite the topic before the user confirms the scoped question.',
    riskNotes: ['The current compile path may still reject unsupported domains.']
  };

  const judgeBrief: PlanningRoleBrief = {
    role: 'opportunity-judge',
    summary: `Keep the first option aligned to the original question: ${option.primaryKeyword}.`,
    confidence: 'medium',
    keyFindings: roleBriefs.flatMap((brief) => brief.keyFindings).slice(0, 4),
    openQuestions: [
      'Confirm whether the current compile path supports this domain before proceeding.'
    ],
    signalFamilies: ['search', 'content']
  };

  return {
    option,
    judgeBrief,
    input: {
      title,
      query: option.primaryKeyword,
      market: intent.geoCandidates[0],
      audience: option.audience,
      problem: `Need to answer the user question: ${option.primaryKeyword}.`,
      outcome: 'Produce a source-backed answer and recommendation.',
      geo: option.geo,
      language: option.language
    }
  };
};
