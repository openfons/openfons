import type {
  CompilationResult,
  OpportunityInput,
  OpportunitySpec,
  ReportSpec,
  TaskSpec,
  WorkflowSpec
} from '@openfons/contracts';
import { createArtifact } from '@openfons/domain-models';
import { createId, nowIso, slugify } from '@openfons/shared';
import { buildAiProcurementCase } from './cases/ai-procurement.js';

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

  const caseBundle = buildAiProcurementCase(opportunity, workflow);
  const reportCreatedAt = nowIso();
  const report: ReportSpec = {
    id: createId('report'),
    opportunityId: opportunity.id,
    slug: opportunity.pageCandidates[0].slug,
    title: opportunity.pageCandidates[0].title,
    summary: 'First evidence-backed AI procurement report.',
    audience: opportunity.audience,
    geo: opportunity.geo,
    language: opportunity.language,
    thesis:
      'Start from official provider pricing and availability, then caveat relay convenience versus direct compliance certainty.',
    claims: [
      {
        id: 'claim_direct_anchor',
        label: 'Official direct-buy baseline',
        statement:
          'Direct provider pricing must anchor comparisons before any relay premium or convenience claim.',
        evidenceIds: [caseBundle.evidenceSet.items[0].id]
      },
      {
        id: 'claim_region_first',
        label: 'Region is not optional',
        statement:
          'Country availability and language support can change the best procurement path even when headline price looks cheaper elsewhere.',
        evidenceIds: [caseBundle.evidenceSet.items[2].id]
      }
    ],
    sourceIndex: caseBundle.sourceCaptures.map((capture) => ({
      captureId: capture.id,
      title: capture.title,
      url: capture.url,
      sourceKind: capture.sourceKind,
      useAs: capture.useAs,
      reportability: capture.reportability,
      riskLevel: capture.riskLevel,
      lastCheckedAt: capture.accessedAt
    })),
    sections: [
      {
        id: createId('sec'),
        title: 'Quick Answer',
        body: 'Use official pricing and availability pages to set the baseline, then caveat relay convenience and community pain points.'
      },
      {
        id: createId('sec'),
        title: 'Evidence Scope',
        body: 'This first run covers provider pricing, relay pricing, and official region availability only.'
      }
    ],
    evidenceBoundaries: [
      'Do not publish pricing claims without at least one official pricing capture.',
      'Relay comparisons must preserve caveats when source terms come from relay-owned pages.'
    ],
    risks: [
      'A deterministic first run can prove the chain shape, but it does not replace later live collection.',
      'Community pain points may corroborate workflow friction, but they do not override official pricing or availability.'
    ],
    updateLog: [
      {
        at: reportCreatedAt,
        note: 'Initial AI procurement evidence-backed report compiled.'
      }
    ],
    createdAt: reportCreatedAt,
    updatedAt: reportCreatedAt
  };

  const artifacts = [
    createArtifact(
      caseBundle.topicRun.id,
      'report',
      `memory://report/${report.id}`,
      report.id
    )
  ];

  return {
    opportunity: {
      ...opportunity,
      status: 'compiled'
    },
    tasks,
    workflow,
    topicRun: caseBundle.topicRun,
    sourceCaptures: caseBundle.sourceCaptures,
    collectionLogs: caseBundle.collectionLogs,
    evidenceSet: caseBundle.evidenceSet,
    report,
    artifacts
  };
};
