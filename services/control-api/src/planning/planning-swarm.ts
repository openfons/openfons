import type {
  PlanningRoleBrief,
  StructuredIntent
} from '@openfons/contracts';

export const runPlanningSwarm = (
  intent: StructuredIntent
): PlanningRoleBrief[] => [
  {
    role: 'intent-clarifier',
    summary: `Interpret the question as ${intent.intentCandidates.join(', ')} around ${intent.topic}.`,
    confidence: 'medium',
    keyFindings: [`Topic: ${intent.topic}`],
    openQuestions: ['Validate the intended audience, geography, and supporting sources.'],
    signalFamilies: ['search', 'content']
  },
  {
    role: 'demand-analyst',
    summary: 'The question appears to express bounded decision demand rather than open-ended exploration.',
    confidence: 'medium',
    keyFindings: [`Primary audience: ${intent.audienceCandidates[0]}`],
    openQuestions: ['Confirm current search demand before publishing.'],
    signalFamilies: ['search', 'community', 'update']
  },
  {
    role: 'competition-analyst',
    summary:
      intent.intentCandidates.includes('comparison')
        ? 'The safest first page is a bounded comparison instead of a broad directory.'
        : 'The safest first page is a bounded answer to the original user question.',
    confidence: 'medium',
    keyFindings: ['The first delivery should stay tightly scoped to one answerable page.'],
    openQuestions: ['Review SERP saturation before launch.'],
    signalFamilies: ['search', 'content']
  },
  {
    role: 'monetization-analyst',
    summary:
      'A validated opportunity can later support tools, consulting, or monitoring layers.',
    confidence: 'medium',
    keyFindings: ['Do not broaden the first page beyond what evidence can support.'],
    openQuestions: ['Do not recommend vendors or products without evidence.'],
    signalFamilies: ['commercial']
  }
];
