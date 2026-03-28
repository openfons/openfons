import type {
  CompilationResult,
  OpportunityInput,
  OpportunitySpec,
  ReportSpec,
  TaskSpec,
  WorkflowSpec
} from '@openfons/contracts';
import { createId, nowIso, slugify } from '@openfons/shared';

export const buildOpportunity = (input: OpportunityInput): OpportunitySpec => ({
  id: createId('opp'),
  slug: slugify(input.title),
  title: input.title,
  market: input.market,
  input,
  status: 'draft',
  createdAt: nowIso()
});

export const buildCompilation = (
  opportunity: OpportunitySpec
): CompilationResult => {
  const tasks: TaskSpec[] = [
    {
      id: createId('task'),
      opportunityId: opportunity.id,
      kind: 'collect-evidence',
      status: 'ready'
    },
    {
      id: createId('task'),
      opportunityId: opportunity.id,
      kind: 'score-opportunity',
      status: 'ready'
    },
    {
      id: createId('task'),
      opportunityId: opportunity.id,
      kind: 'render-report',
      status: 'ready'
    }
  ];

  const workflow: WorkflowSpec = {
    id: createId('wf'),
    opportunityId: opportunity.id,
    taskIds: tasks.map((task) => task.id),
    status: 'ready'
  };

  const report: ReportSpec = {
    id: createId('report'),
    opportunityId: opportunity.id,
    title: opportunity.title,
    summary: `Minimal report shell for ${opportunity.title}`,
    sections: [
      {
        id: createId('sec'),
        title: 'Why this topic now',
        body: `${opportunity.input.problem} -> ${opportunity.input.outcome}`
      },
      {
        id: createId('sec'),
        title: 'Target audience',
        body: `${opportunity.input.audience} in ${opportunity.market}`
      },
      {
        id: createId('sec'),
        title: 'Next execution slice',
        body: 'Replace in-memory shell generation with real evidence ingestion in the next plan.'
      }
    ],
    createdAt: nowIso()
  };

  return {
    opportunity: {
      ...opportunity,
      status: 'compiled'
    },
    tasks,
    workflow,
    report
  };
};
