import type {
  StructuredIntent,
  PlanningSignalBrief,
  PlanningTrace
} from '@openfons/contracts';

export const buildPlanningTrace = ({
  intent,
  signalBrief,
  recommendedKeyword
}: {
  intent: StructuredIntent;
  signalBrief: PlanningSignalBrief;
  recommendedKeyword: string;
}): PlanningTrace => {
  const comparisonMode = intent.intentCandidates.includes('comparison');
  const aiProcurement = intent.caseKey === 'ai-procurement';

  return {
    steps: [
      {
        step: 'structure_intent',
        status: 'completed',
        summary: aiProcurement
          ? 'Structured the raw user question into AI procurement intent.'
          : 'Structured the raw user question into a scoped opportunity intent.'
      },
      {
        step: 'run_demand_analysis',
        status: 'completed',
        summary: signalBrief.briefGoal
      },
      {
        step: 'run_competition_analysis',
        status: 'completed',
        summary: comparisonMode
          ? 'Kept the first option bounded to one comparison page.'
          : 'Kept the first option bounded to one answerable page.'
      },
      {
        step: 'run_monetization_analysis',
        status: 'completed',
        summary: 'Preserved commercial fit as a planning signal, not a final claim.'
      },
      {
        step: 'judge_opportunity',
        status: 'completed',
        summary: `Recommended ${recommendedKeyword} for user confirmation.`
      }
    ],
    sourceCoverage: signalBrief.sourceCoverage,
    searchRunIds: [],
    openQuestions: [
      aiProcurement
        ? 'Validate pricing, routing, region, and community evidence.'
        : 'Validate domain evidence and compile-path support before proceeding.'
    ],
    contradictions: []
  };
};
