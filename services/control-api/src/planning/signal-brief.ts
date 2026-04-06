import type {
  OpportunityInput,
  OpportunityIntakeProfile,
  PlanningSignalBrief,
  SignalSourceId
} from '@openfons/contracts';

const ENTITY_PATTERNS = [
  { label: 'OpenAI', pattern: /\bopenai\b/i },
  { label: 'OpenRouter', pattern: /\bopenrouter\b/i },
  { label: 'Anthropic', pattern: /\banthropic\b/i },
  { label: 'Claude', pattern: /\bclaude\b/i },
  { label: 'Gemini', pattern: /\bgemini\b/i },
  { label: 'Perplexity', pattern: /\bperplexity\b/i },
  { label: 'Cursor', pattern: /\bcursor\b/i },
  { label: 'Codex', pattern: /\bcodex\b/i }
] as const;

const extractCandidateEntities = (input: OpportunityInput) => {
  const haystack = [input.title, input.query, input.problem, input.outcome].join(' ');
  const matches = ENTITY_PATTERNS.filter((item) => item.pattern.test(haystack)).map(
    (item) => item.label
  );

  if (matches.length > 0) {
    return matches;
  }

  return [input.title];
};

const isComparisonIntent = (haystack: string) =>
  /\bvs\b|\bversus\b|\bcompare\b|\bcomparison\b/i.test(haystack);

const isTrendWatchIntent = (haystack: string) =>
  /\blast\s*30\s*days\b|\brecent\b|\btrend\b|\brising\b|\bgrowing\b/i.test(
    haystack
  );

const isProblemInvestigationIntent = (haystack: string) =>
  /\bwhy\b|\bissue\b|\bproblem\b|\bcomplaint\b|\boutage\b|\bfail(?:ed|ure)?\b/i.test(
    haystack
  );

const buildSourceCoverage = (
  input: OpportunityInput,
  comparisonMode: boolean,
  intakeKind: OpportunityIntakeProfile['intakeKind']
): PlanningSignalBrief['sourceCoverage'] => {
  const haystack = [input.title, input.query, input.problem, input.outcome]
    .join(' ')
    .toLowerCase();
  const sources: Array<{
    sourceId: SignalSourceId;
    role: 'required' | 'recommended' | 'optional';
    rationale: string;
  }> = [
    {
      sourceId: 'web',
      role: 'required',
      rationale: 'Always ground the planning brief with public docs, announcements, and indexed pages.'
    },
    {
      sourceId: 'reddit',
      role: 'recommended',
      rationale: 'Useful for practitioner pain points, migration issues, and emerging discussion clusters.'
    },
    {
      sourceId: 'hacker-news',
      role: 'recommended',
      rationale: 'Useful for developer-adjacent launch reaction, critique, and adoption signals.'
    }
  ];

  if (
    comparisonMode ||
    haystack.includes('video') ||
    haystack.includes('creator') ||
    haystack.includes('youtube')
  ) {
    sources.push({
      sourceId: 'youtube',
      role: 'recommended',
      rationale: 'Video explainers and walkthroughs often surface recent comparison narratives.'
    });
  }

  if (comparisonMode || intakeKind === 'trend-watch') {
    sources.push({
      sourceId: 'x',
      role: 'optional',
      rationale: 'Fast-moving social discussion can help detect fresh vendor or feature chatter.'
    });
  }

  if (
    haystack.includes('market') ||
    haystack.includes('prediction') ||
    haystack.includes('odds')
  ) {
    sources.push({
      sourceId: 'polymarket',
      role: 'optional',
      rationale: 'Prediction-market chatter can supplement fast-moving topic attention, when relevant.'
    });
  }

  return sources.map((item) => ({
    ...item,
    status: 'planned' as const
  }));
};

export const buildPlanningSignalBrief = (
  input: OpportunityInput
): PlanningSignalBrief => {
  const haystack = [input.title, input.query, input.problem, input.outcome].join(' ');
  const comparisonMode = isComparisonIntent(haystack);
  const intakeKind = isTrendWatchIntent(haystack)
    ? 'trend-watch'
    : isProblemInvestigationIntent(haystack)
      ? 'problem-investigation'
      : comparisonMode
        ? 'comparison'
        : 'single-subject';
  const candidateEntities = extractCandidateEntities(input);

  return {
    lookbackDays: 30,
    comparisonMode,
    candidateEntities,
    sourceCoverage: buildSourceCoverage(input, comparisonMode, intakeKind),
    signalFamilies: ['search', 'community', 'content', 'update'],
    briefGoal:
      comparisonMode
        ? `Establish the last-30-days comparison signal around ${candidateEntities.join(' vs ')} before freezing the page angle.`
        : `Establish the last-30-days public signal around ${candidateEntities[0]} before freezing the opportunity scope.`
  };
};

export const buildOpportunityIntakeProfile = (
  input: OpportunityInput,
  signalBrief: PlanningSignalBrief
): OpportunityIntakeProfile => {
  const haystack = [input.title, input.query, input.problem, input.outcome].join(' ');
  const intakeKind = isTrendWatchIntent(haystack)
    ? 'trend-watch'
    : isProblemInvestigationIntent(haystack)
      ? 'problem-investigation'
      : signalBrief.comparisonMode
        ? 'comparison'
        : 'single-subject';

  const researchMode =
    intakeKind === 'trend-watch'
      ? 'last30days-brief'
      : intakeKind === 'single-subject'
        ? 'direct-compile'
        : 'hybrid';

  return {
    intakeKind,
    researchMode,
    acceptedDelivery: 'report-web',
    primaryDecision: input.outcome,
    notes: [
      'Keep the signal brief inside OpportunitySpec as a planning subobject, not as a parallel external contract.',
      'Use cross-source convergence to narrow the angle before controlled evidence capture starts.',
      researchMode === 'direct-compile'
        ? 'This intake can move directly into compile once official targets and evidence requirements are clear.'
        : 'This intake should keep a recent-signal pass before compile to avoid freezing the wrong angle.'
    ]
  };
};
