import type {
  CompilationResult,
  OpportunityInput,
  OpportunitySpec,
  ReportSpec,
  TaskSpec,
  WorkflowSpec
} from '@openfons/contracts';
import { createId, nowIso, slugify } from '@openfons/shared';

export class InvalidOpportunityInputError extends Error {}

const DEFAULT_EVIDENCE_REQUIREMENTS: OpportunitySpec['evidenceRequirements'] = [
  {
    kind: 'official-docs',
    note: 'Capture the official provider or platform documentation page.'
  },
  {
    kind: 'official-pricing',
    note: 'Capture the official pricing page.'
  },
  {
    kind: 'official-availability',
    note: 'Capture the official regional availability page.'
  },
  {
    kind: 'community-corroboration',
    note: 'Capture one independent community source to corroborate workflow pain points.'
  }
];

const DEFAULT_PRODUCT_HINTS: OpportunitySpec['productOpportunityHints'] = [
  {
    kind: 'tracker',
    note: 'Track price and routing policy changes over time.'
  },
  {
    kind: 'calculator',
    note: 'Estimate monthly spend across direct and routed usage.'
  },
  {
    kind: 'advisor',
    note: 'Recommend the first decision path for the selected audience.'
  },
  {
    kind: 'subscription',
    note: 'Package recurring updates as member-only intelligence.'
  }
];

const buildPageCandidates = (input: OpportunityInput) => {
  const primarySlug = slugify(input.title);

  return [
    {
      slug: primarySlug,
      title: input.title,
      query: input.query
    },
    {
      slug: `${primarySlug}-decision-guide`,
      title: `${input.title} Decision Guide`,
      query: `${input.query} decision guide`
    }
  ];
};

export const buildOpportunity = (input: OpportunityInput): OpportunitySpec => {
  const slug = slugify(input.title);

  if (!slug) {
    throw new InvalidOpportunityInputError(
      'Title must contain at least one alphanumeric character'
    );
  }

  return {
    id: createId('opp'),
    slug,
    title: input.title,
    market: input.market,
    input,
    status: 'draft',
    createdAt: nowIso(),
    audience: input.audience,
    geo: input.geo,
    language: input.language,
    searchIntent: 'decision',
    angle: `${input.problem} -> ${input.outcome}`,
    firstDeliverySurface: 'report-web',
    pageCandidates: buildPageCandidates(input),
    evidenceRequirements: DEFAULT_EVIDENCE_REQUIREMENTS,
    productOpportunityHints: DEFAULT_PRODUCT_HINTS
  };
};

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

  const reportCreatedAt = nowIso();
  const report: ReportSpec = {
    id: createId('report'),
    opportunityId: opportunity.id,
    slug: opportunity.pageCandidates[0].slug,
    title: opportunity.pageCandidates[0].title,
    summary: `Decision report for ${opportunity.title}`,
    audience: opportunity.audience,
    geo: opportunity.geo,
    language: opportunity.language,
    thesis: opportunity.angle,
    sections: [
      {
        id: createId('sec'),
        title: 'Quick Answer',
        body: `Start with a ${opportunity.searchIntent} report for ${opportunity.audience} in ${opportunity.geo}.`
      },
      {
        id: createId('sec'),
        title: 'Evidence Boundary',
        body: opportunity.evidenceRequirements.map((item) => item.note).join(' ')
      },
      {
        id: createId('sec'),
        title: 'First Delivery Surface',
        body: 'Publish the report-web artifact before expanding to derivative content or product surfaces.'
      }
    ],
    evidenceBoundaries: opportunity.evidenceRequirements.map((item) => item.note),
    risks: [
      'Do not publish price or availability claims without official source captures.',
      'Do not split tool or subscription contracts out of OpportunitySpec in v1.'
    ],
    updateLog: [
      {
        at: reportCreatedAt,
        note: 'Initial deterministic report shell generated from OpportunitySpec.'
      }
    ],
    createdAt: reportCreatedAt
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
