import type {
  CompilationPolicyCode,
  CompilationResult,
  OpportunityInput,
  OpportunitySpec,
  ReportSpec,
  SearchIntent,
  TaskSpec,
  WorkflowSpec
} from '@openfons/contracts';
import { createArtifact } from '@openfons/domain-models';
import { createId, nowIso, slugify } from '@openfons/shared';
import {
  addAiProcurementFallbackWarning,
  buildAiProcurementCase,
  resolveAiProcurementProfileForOpportunity
} from './cases/ai-procurement.js';
import {
  classifyAiProcurementOpportunity,
  formatAiProcurementPolicyMessage
} from './cases/ai-procurement-intake.js';
import { validateAiProcurementEvidence } from './cases/ai-procurement-evidence.js';
import {
  createAiProcurementRealCollectionBridge,
  isAiProcurementRuntimeError,
  type BuildAiProcurementCaseBundle
} from './collection/real-collection-bridge.js';
import {
  buildOpportunityIntakeProfile,
  buildPlanningSignalBrief
} from './planning/signal-brief.js';
import { buildPlanningDiscoveryAudit } from './planning/discovery-audit.js';

export class InvalidOpportunityInputError extends Error {}
export class UnsupportedCompilationCaseError extends Error {}
export class CompilationPolicyError extends UnsupportedCompilationCaseError {
  constructor(
    readonly code: CompilationPolicyCode,
    readonly status: 409 | 422,
    message: string
  ) {
    super(message);
    this.name = 'CompilationPolicyError';
  }
}

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

const resolveSearchIntent = (
  intakeKind: NonNullable<OpportunitySpec['intakeProfile']>['intakeKind']
): SearchIntent => {
  switch (intakeKind) {
    case 'comparison':
      return 'comparison';
    case 'trend-watch':
    case 'problem-investigation':
      return 'evaluation';
    default:
      return 'decision';
  }
};

export const buildOpportunity = (input: OpportunityInput): OpportunitySpec => {
  const slug = slugify(input.title);

  if (!slug) {
    throw new InvalidOpportunityInputError(
      'Title must contain at least one alphanumeric character'
    );
  }

  const planningSignalBrief = buildPlanningSignalBrief(input);
  const intakeProfile = buildOpportunityIntakeProfile(input, planningSignalBrief);

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
    searchIntent: resolveSearchIntent(intakeProfile.intakeKind),
    angle: `${input.problem} -> ${input.outcome}`,
    firstDeliverySurface: 'report-web',
    pageCandidates: buildPageCandidates(input),
    evidenceRequirements: DEFAULT_EVIDENCE_REQUIREMENTS,
    productOpportunityHints: DEFAULT_PRODUCT_HINTS,
    planningSignalBrief,
    intakeProfile
  };
};

const createTasks = (opportunityId: string): TaskSpec[] => [
  {
    id: createId('task'),
    opportunityId,
    kind: 'collect-evidence',
    status: 'ready'
  },
  {
    id: createId('task'),
    opportunityId,
    kind: 'score-opportunity',
    status: 'ready'
  },
  {
    id: createId('task'),
    opportunityId,
    kind: 'render-report',
    status: 'ready'
  }
];

const createWorkflow = (
  opportunityId: string,
  tasks: TaskSpec[]
): WorkflowSpec => ({
  id: createId('wf'),
  opportunityId,
  taskIds: tasks.map((task) => task.id),
  status: 'ready'
});

const buildCaseBundle = async (
  opportunity: OpportunitySpec,
  workflow: WorkflowSpec,
  buildAiProcurementCaseBundle?: BuildAiProcurementCaseBundle
) => {
  const caseBuilder =
    buildAiProcurementCaseBundle ?? createAiProcurementRealCollectionBridge();

  try {
    return await caseBuilder(opportunity, workflow);
  } catch (error) {
    if (!isAiProcurementRuntimeError(error)) {
      throw error;
    }

    return addAiProcurementFallbackWarning(
      buildAiProcurementCase(opportunity, workflow),
      error.message,
      error.logs ?? []
    );
  }
};

export const buildCompilation = async (
  opportunity: OpportunitySpec,
  deps: {
    buildAiProcurementCaseBundle?: BuildAiProcurementCaseBundle;
  } = {}
): Promise<CompilationResult> => {
  if (
    opportunity.planning &&
    opportunity.planning.approval.status !== 'confirmed'
  ) {
    throw new CompilationPolicyError(
      'needs_user_confirmation',
      409,
      'Opportunity must be confirmed before compilation.'
    );
  }

  const policy = classifyAiProcurementOpportunity(opportunity);

  if (!policy.supported) {
    throw new CompilationPolicyError(
      policy.reason,
      409,
      formatAiProcurementPolicyMessage(policy)
    );
  }

  const tasks = createTasks(opportunity.id);
  const workflow = createWorkflow(opportunity.id, tasks);
  const caseBundle = await buildCaseBundle(
    opportunity,
    workflow,
    deps.buildAiProcurementCaseBundle
  );
  const planningDiscovery = buildPlanningDiscoveryAudit({
    opportunity,
    topicRunId: caseBundle.topicRun.id
  });
  const profile = resolveAiProcurementProfileForOpportunity(opportunity);
  const evidencePolicy = validateAiProcurementEvidence({
    sourceCaptures: caseBundle.sourceCaptures,
    evidenceSet: caseBundle.evidenceSet
  });

  if (!evidencePolicy.valid) {
    throw new CompilationPolicyError(
      evidencePolicy.code,
      422,
      evidencePolicy.message
    );
  }

  const reportCreatedAt = nowIso();
  const report: ReportSpec = {
    id: createId('report'),
    opportunityId: opportunity.id,
    slug: opportunity.pageCandidates[0].slug,
    title: opportunity.pageCandidates[0].title,
    summary: profile.report.summary,
    audience: opportunity.audience,
    geo: opportunity.geo,
    language: opportunity.language,
    thesis: profile.report.thesis,
    claims: profile.report.claims.map((claim) => ({
      id: claim.id,
      label: claim.label,
      statement: claim.statement,
      evidenceIds: claim.evidenceIndexes.map(
        (index) => caseBundle.evidenceSet.items[index].id
      )
    })),
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
    sections: profile.report.sections.map((section) => ({
      id: createId('sec'),
      title: section.title,
      body: section.body
    })),
    evidenceBoundaries: profile.report.evidenceBoundaries,
    risks: profile.report.risks,
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
    sourceCaptures: [
      ...caseBundle.sourceCaptures,
      ...planningDiscovery.sourceCaptures
    ],
    collectionLogs: [
      ...caseBundle.collectionLogs,
      ...planningDiscovery.collectionLogs
    ],
    evidenceSet: caseBundle.evidenceSet,
    report,
    artifacts
  };
};
