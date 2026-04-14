import type { OpportunityQuestion } from '@openfons/contracts';
import { buildOpportunity } from '../compiler.js';
import { structureIntent } from './intent-structuring.js';
import { judgeOpportunity } from './opportunity-judge.js';
import { runPlanningSwarm } from './planning-swarm.js';
import { buildPlanningTrace } from './trace.js';

export const planOpportunityFromQuestion = (question: OpportunityQuestion) => {
  const intent = structureIntent(question);
  const roleBriefs = runPlanningSwarm(intent);
  const { option, input, judgeBrief } = judgeOpportunity({ intent, roleBriefs });
  const opportunity = buildOpportunity(input);
  const planningSignalBrief = opportunity.planningSignalBrief;

  if (!planningSignalBrief) {
    throw new Error('Expected planningSignalBrief to exist for planned opportunity');
  }

  return {
    ...opportunity,
    planningSignalBrief,
    planning: {
      question,
      intent,
      roleBriefs: [...roleBriefs, judgeBrief],
      options: [option],
      recommendedOptionId: option.id,
      approval: {
        status: 'pending_user_confirmation' as const
      },
      trace: buildPlanningTrace({
        intent,
        signalBrief: planningSignalBrief,
        recommendedKeyword: option.primaryKeyword
      })
    }
  };
};
