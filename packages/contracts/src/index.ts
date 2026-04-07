import { z } from 'zod';

export * from './config-center.js';

export const OpportunityInputSchema = z.object({
  title: z.string().min(1),
  query: z.string().min(1),
  market: z.string().min(1),
  audience: z.string().min(1),
  problem: z.string().min(1),
  outcome: z.string().min(1),
  geo: z.string().min(1),
  language: z.string().min(1)
});

export const OpportunityStatusSchema = z.enum(['draft', 'compiled']);
export const CompilationPolicyCodeSchema = z.enum([
  'out_of_scope_domain',
  'missing_official_targets',
  'insufficient_public_evidence',
  'needs_authenticated_capture',
  'underspecified_buyer_decision'
]);
export const TaskKindSchema = z.enum([
  'collect-evidence',
  'score-opportunity',
  'render-report'
]);
export const TaskStatusSchema = z.enum(['queued', 'ready']);
export const WorkflowStatusSchema = z.enum(['draft', 'ready']);
export const DeliverySurfaceSchema = z.enum(['report-web']);
export const SearchIntentSchema = z.enum(['decision', 'comparison', 'evaluation']);
export const SearchPurposeSchema = z.enum(['planning', 'evidence']);
export const SearchRunStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed'
]);
export const SearchProviderIdSchema = z.enum([
  'google',
  'bing',
  'baidu',
  'ddg',
  'brave',
  'tavily'
]);
export const SearchProviderCategorySchema = z.enum([
  'external-api',
  'self-hosted',
  'open-source-meta'
]);
export const SearchProviderHealthSchema = z.enum([
  'healthy',
  'degraded',
  'unavailable'
]);
export const SearchCredentialSourceSchema = z.enum(['system', 'project', 'none']);
export const UpgradeActionSchema = z.enum(['http', 'browser', 'api', 'skip']);
export const SourceKindGuessSchema = z.enum([
  'official',
  'community',
  'commercial',
  'inference',
  'unknown'
]);
export const ProviderDiagnosticStatusSchema = z.enum([
  'success',
  'degraded',
  'failed'
]);

export const SearchRequestSchema = z.object({
  projectId: z.string().min(1),
  opportunityId: z.string().min(1).optional(),
  workflowId: z.string().min(1).optional(),
  taskId: z.string().min(1).optional(),
  purpose: SearchPurposeSchema,
  query: z.string().min(1),
  geo: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  providers: z.array(SearchProviderIdSchema).min(1).optional(),
  maxResults: z.number().int().positive(),
  pages: z.number().int().positive(),
  autoUpgrade: z.boolean(),
  policyOverride: z.record(z.unknown()).optional()
});

export const SearchRunSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  opportunityId: z.string().min(1).optional(),
  workflowId: z.string().min(1).optional(),
  taskId: z.string().min(1).optional(),
  purpose: SearchPurposeSchema,
  query: z.string().min(1),
  status: SearchRunStatusSchema,
  selectedProviders: z.array(SearchProviderIdSchema).min(1),
  degradedProviders: z.array(SearchProviderIdSchema),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional()
});

export const SearchResultSchema = z.object({
  id: z.string().min(1),
  searchRunId: z.string().min(1),
  provider: SearchProviderIdSchema,
  title: z.string().min(1),
  url: z.string().url(),
  snippet: z.string().min(1),
  rank: z.number().int().positive(),
  page: z.number().int().positive(),
  domain: z.string().min(1),
  sourceKindGuess: SourceKindGuessSchema,
  dedupKey: z.string().min(1),
  selectedForUpgrade: z.boolean(),
  selectionReason: z.string().min(1)
});

export const UpgradeCandidateSchema = z.object({
  searchResultId: z.string().min(1),
  searchRunId: z.string().min(1),
  opportunityId: z.string().min(1).optional(),
  workflowId: z.string().min(1).optional(),
  recommendedAction: UpgradeActionSchema,
  reason: z.string().min(1),
  priority: z.number().int(),
  requiresHumanReview: z.boolean(),
  proposedSourceKind: SourceKindGuessSchema,
  proposedUseAs: z.string().min(1)
});

export const ProviderDiagnosticSchema = z.object({
  providerId: SearchProviderIdSchema,
  status: ProviderDiagnosticStatusSchema,
  degraded: z.boolean(),
  reason: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
  resultCount: z.number().int().nonnegative(),
  rateLimitState: z.string().min(1).optional()
});

export const DowngradeInfoSchema = z.object({
  providerId: SearchProviderIdSchema,
  status: z.string().min(1),
  reason: z.string().min(1),
  fallbackProviderId: SearchProviderIdSchema.optional(),
  phase: z.string().min(1),
  occurredAt: z.string().datetime()
});

export const ProviderCapabilitySchema = z.object({
  providerId: SearchProviderIdSchema,
  displayName: z.string().min(1),
  category: SearchProviderCategorySchema,
  enabledByDefault: z.boolean(),
  requiresCredential: z.boolean(),
  supportsGeo: z.boolean(),
  supportsLanguage: z.boolean(),
  supportsPagination: z.boolean(),
  supportsMultiQuery: z.boolean(),
  supportsAsync: z.boolean(),
  supportsSnippet: z.boolean(),
  supportsRichMetadata: z.boolean(),
  supportsRateLimitHeader: z.boolean(),
  defaultPriority: z.number().int(),
  defaultTimeoutMs: z.number().int().positive(),
  degradePriority: z.number().int(),
  riskLevel: z.string().min(1),
  notes: z.string().min(1)
});

export const CredentialSchemaSchema = z.object({
  providerId: SearchProviderIdSchema,
  requiredFields: z.array(z.string().min(1)),
  optionalFields: z.array(z.string().min(1)),
  validationRules: z.array(z.string().min(1)),
  sensitiveFields: z.array(z.string().min(1)),
  projectOverrideAllowed: z.boolean()
});

export const ProviderStatusSchema = z.object({
  providerId: SearchProviderIdSchema,
  enabled: z.boolean(),
  healthy: z.boolean(),
  credentialResolvedFrom: SearchCredentialSourceSchema,
  degraded: z.boolean(),
  reason: z.string().min(1).optional()
});

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string().min(1)),
  warnings: z.array(z.string().min(1)),
  resolvedProviders: z.array(ProviderStatusSchema)
});

export const CollectorDispatchRequestSchema = z.object({
  searchResultId: z.string().min(1),
  action: UpgradeActionSchema,
  url: z.string().url()
});

export const UpgradeDispatchResultSchema = z.object({
  searchRunId: z.string().min(1),
  dispatchedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  collectorRequests: z.array(CollectorDispatchRequestSchema),
  warnings: z.array(z.string().min(1))
});

export const SearchRunResultSchema = z.object({
  searchRun: SearchRunSchema,
  results: z.array(SearchResultSchema),
  upgradeCandidates: z.array(UpgradeCandidateSchema),
  diagnostics: z.array(ProviderDiagnosticSchema),
  downgradeInfo: z.array(DowngradeInfoSchema)
});

export const PageCandidateSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  query: z.string().min(1)
});

export const EvidenceRequirementSchema = z.object({
  kind: z.enum([
    'official-docs',
    'official-pricing',
    'official-availability',
    'community-corroboration'
  ]),
  note: z.string().min(1)
});

export const ProductOpportunityHintSchema = z.object({
  kind: z.enum(['tracker', 'calculator', 'advisor', 'subscription']),
  note: z.string().min(1)
});

export const SignalSourceIdSchema = z.enum([
  'web',
  'reddit',
  'x',
  'youtube',
  'hacker-news',
  'polymarket',
  'bluesky',
  'tiktok',
  'instagram'
]);

export const SignalCoverageRoleSchema = z.enum([
  'required',
  'recommended',
  'optional'
]);

export const SignalCoverageStatusSchema = z.enum([
  'planned',
  'covered',
  'partial',
  'missing'
]);

export const OpportunityForecastSignalFamilySchema = z.enum([
  'search',
  'community',
  'commercial',
  'content',
  'update'
]);

export const PlanningSignalSourceSchema = z.object({
  sourceId: SignalSourceIdSchema,
  role: SignalCoverageRoleSchema,
  status: SignalCoverageStatusSchema,
  rationale: z.string().min(1)
});

export const PlanningSignalBriefSchema = z.object({
  lookbackDays: z.number().int().positive(),
  comparisonMode: z.boolean(),
  candidateEntities: z.array(z.string().min(1)).min(1),
  sourceCoverage: z.array(PlanningSignalSourceSchema).min(1),
  signalFamilies: z.array(OpportunityForecastSignalFamilySchema).min(1),
  briefGoal: z.string().min(1)
});

export const OpportunityIntakeKindSchema = z.enum([
  'comparison',
  'single-subject',
  'trend-watch',
  'problem-investigation'
]);

export const OpportunityResearchModeSchema = z.enum([
  'direct-compile',
  'last30days-brief',
  'hybrid'
]);

export const OpportunityIntakeProfileSchema = z.object({
  intakeKind: OpportunityIntakeKindSchema,
  researchMode: OpportunityResearchModeSchema,
  primaryDecision: z.string().min(1),
  acceptedDelivery: DeliverySurfaceSchema,
  notes: z.array(z.string().min(1)).min(1)
});

export const OpportunitySpecSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  market: z.string().min(1),
  input: OpportunityInputSchema,
  status: OpportunityStatusSchema,
  createdAt: z.string().datetime(),
  audience: z.string().min(1),
  geo: z.string().min(1),
  language: z.string().min(1),
  searchIntent: SearchIntentSchema,
  angle: z.string().min(1),
  firstDeliverySurface: DeliverySurfaceSchema,
  pageCandidates: z.array(PageCandidateSchema).min(1),
  evidenceRequirements: z.array(EvidenceRequirementSchema).min(1),
  productOpportunityHints: z.array(ProductOpportunityHintSchema),
  planningSignalBrief: PlanningSignalBriefSchema.optional(),
  intakeProfile: OpportunityIntakeProfileSchema.optional()
});

export const TaskSpecSchema = z.object({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  kind: TaskKindSchema,
  status: TaskStatusSchema
});

export const WorkflowSpecSchema = z.object({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  taskIds: z.array(z.string().min(1)).min(1),
  status: WorkflowStatusSchema
});

export const ReportSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1)
});

export const UpdateLogEntrySchema = z.object({
  at: z.string().datetime(),
  note: z.string().min(1)
});

export const SourceKindSchema = z.enum([
  'official',
  'community',
  'commercial',
  'inference'
]);

export const SourceUseAsSchema = z.enum([
  'primary',
  'secondary',
  'corroboration',
  'discovery-only'
]);

export const ReportabilitySchema = z.enum([
  'reportable',
  'caveated',
  'blocked'
]);

export const RiskLevelSchema = z.enum(['low', 'medium', 'high']);

export const CaptureTypeSchema = z.enum([
  'pricing-page',
  'availability-page',
  'doc-page',
  'community-thread',
  'analysis-note'
]);

export const CaptureStatusSchema = z.enum(['captured', 'failed']);
export const TopicRunStatusSchema = z.enum([
  'planned',
  'captured',
  'qualified',
  'compiled'
]);
export const CollectionStepSchema = z.enum([
  'discover',
  'capture',
  'qualify',
  'compile'
]);
export const CollectionStatusSchema = z.enum(['success', 'warning', 'error']);
export const EvidenceKindSchema = z.enum([
  'pricing',
  'availability',
  'routing',
  'language',
  'community',
  'inference'
]);
export const ArtifactTypeSchema = z.enum([
  'opportunity',
  'topic-run',
  'evidence-set',
  'report'
]);
export const ArtifactStorageSchema = z.enum(['memory', 'file']);

export const TopicRunSchema = z.object({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  workflowId: z.string().min(1),
  topicKey: z.string().min(1),
  status: TopicRunStatusSchema,
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const SourceCaptureSchema = z.object({
  id: z.string().min(1),
  topicRunId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  sourceKind: SourceKindSchema,
  useAs: SourceUseAsSchema,
  reportability: ReportabilitySchema,
  riskLevel: RiskLevelSchema,
  captureType: CaptureTypeSchema,
  status: CaptureStatusSchema,
  accessedAt: z.string().datetime(),
  capturedAt: z.string().datetime().optional(),
  language: z.string().min(1),
  region: z.string().min(1),
  summary: z.string().min(1)
});

export const CollectionLogSchema = z.object({
  id: z.string().min(1),
  topicRunId: z.string().min(1),
  captureId: z.string().min(1).optional(),
  step: CollectionStepSchema,
  status: CollectionStatusSchema,
  message: z.string().min(1),
  createdAt: z.string().datetime()
});

export const EvidenceSchema = z.object({
  id: z.string().min(1),
  topicRunId: z.string().min(1),
  captureId: z.string().min(1),
  kind: EvidenceKindSchema,
  statement: z.string().min(1),
  sourceKind: SourceKindSchema,
  useAs: SourceUseAsSchema,
  reportability: ReportabilitySchema,
  riskLevel: RiskLevelSchema,
  freshnessNote: z.string().min(1),
  supportingCaptureIds: z.array(z.string().min(1)).min(1)
});

export const EvidenceSetSchema = z.object({
  id: z.string().min(1),
  topicRunId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z.array(EvidenceSchema).min(1)
});

export const ArtifactSchema = z.object({
  id: z.string().min(1),
  topicRunId: z.string().min(1),
  reportId: z.string().min(1).optional(),
  type: ArtifactTypeSchema,
  storage: ArtifactStorageSchema,
  uri: z.string().min(1),
  createdAt: z.string().datetime()
});

export const ReportClaimSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  statement: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1)
});

export const ReportSourceRefSchema = z.object({
  captureId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  sourceKind: SourceKindSchema,
  useAs: SourceUseAsSchema,
  reportability: ReportabilitySchema,
  riskLevel: RiskLevelSchema,
  lastCheckedAt: z.string().datetime()
});

export const ReportSpecSchema = z.object({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  audience: z.string().min(1),
  geo: z.string().min(1),
  language: z.string().min(1),
  thesis: z.string().min(1),
  claims: z.array(ReportClaimSchema).min(1),
  sourceIndex: z.array(ReportSourceRefSchema).min(1),
  sections: z.array(ReportSectionSchema).min(1),
  evidenceBoundaries: z.array(z.string().min(1)).min(1),
  risks: z.array(z.string().min(1)).min(1),
  updateLog: z.array(UpdateLogEntrySchema).min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const ReportViewSchema = z.object({
  report: ReportSpecSchema,
  evidenceSet: EvidenceSetSchema,
  sourceCaptures: z.array(SourceCaptureSchema).min(1),
  collectionLogs: z.array(CollectionLogSchema).min(1)
});

export const ApiErrorSchema = z.object({
  code: CompilationPolicyCodeSchema.optional(),
  message: z.string().min(1)
});

const REQUIRED_TASK_KINDS = [
  'collect-evidence',
  'score-opportunity',
  'render-report'
] as const;

export const CompilationResultSchema = z
  .object({
    opportunity: OpportunitySpecSchema,
    tasks: z.array(TaskSpecSchema).length(3),
    workflow: WorkflowSpecSchema,
    topicRun: TopicRunSchema,
    sourceCaptures: z.array(SourceCaptureSchema).min(1),
    collectionLogs: z.array(CollectionLogSchema).min(1),
    evidenceSet: EvidenceSetSchema,
    report: ReportSpecSchema,
    artifacts: z.array(ArtifactSchema).min(1)
  })
  .superRefine((value, ctx) => {
    const opportunityId = value.opportunity.id;
    const workflowId = value.workflow.id;
    const topicRunId = value.topicRun.id;
    const reportId = value.report.id;

    value.tasks.forEach((task, index) => {
      if (task.opportunityId !== opportunityId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tasks', index, 'opportunityId'],
          message: 'Task opportunityId must match opportunity.id'
        });
      }
    });

    if (value.workflow.opportunityId !== opportunityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['workflow', 'opportunityId'],
        message: 'Workflow opportunityId must match opportunity.id'
      });
    }

    if (value.report.opportunityId !== opportunityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['report', 'opportunityId'],
        message: 'Report opportunityId must match opportunity.id'
      });
    }

    const taskIds = value.tasks.map((task) => task.id);
    const workflowTaskIds = value.workflow.taskIds;
    const taskIdSet = new Set(taskIds);
    const workflowTaskIdSet = new Set(workflowTaskIds);

    if (taskIdSet.size !== taskIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tasks'],
        message: 'Task ids must be unique'
      });
    }

    if (workflowTaskIdSet.size !== workflowTaskIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['workflow', 'taskIds'],
        message: 'Workflow taskIds must be unique'
      });
    }

    const sameCardinality = taskIds.length === workflowTaskIds.length;
    const sameMembers =
      [...taskIdSet].every((taskId) => workflowTaskIdSet.has(taskId)) &&
      [...workflowTaskIdSet].every((taskId) => taskIdSet.has(taskId));
    const workflowTaskIdsMatch = sameCardinality && sameMembers;

    if (!workflowTaskIdsMatch) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['workflow', 'taskIds'],
        message: 'Workflow taskIds must match task ids'
      });
    }

    const taskKindSet = new Set(value.tasks.map((task) => task.kind));
    const hasRequiredTaskKinds =
      taskKindSet.size === REQUIRED_TASK_KINDS.length &&
      REQUIRED_TASK_KINDS.every((kind) => taskKindSet.has(kind));

    if (!hasRequiredTaskKinds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tasks'],
        message:
          'Tasks must include each required kind exactly once: collect-evidence, score-opportunity, render-report'
      });
    }

    if (value.topicRun.opportunityId !== opportunityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['topicRun', 'opportunityId'],
        message: 'Topic run opportunityId must match opportunity.id'
      });
    }

    if (value.topicRun.workflowId !== workflowId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['topicRun', 'workflowId'],
        message: 'Topic run workflowId must match workflow.id'
      });
    }

    const captureIds = new Set<string>();
    value.sourceCaptures.forEach((capture, index) => {
      captureIds.add(capture.id);

      if (capture.topicRunId !== topicRunId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sourceCaptures', index, 'topicRunId'],
          message: 'Source capture topicRunId must match topicRun.id'
        });
      }

      if (capture.status === 'captured' && !capture.capturedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sourceCaptures', index, 'capturedAt'],
          message: 'Captured source captures must include capturedAt'
        });
      }
    });

    value.collectionLogs.forEach((log, index) => {
      if (log.topicRunId !== topicRunId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['collectionLogs', index, 'topicRunId'],
          message: 'Collection log topicRunId must match topicRun.id'
        });
      }

      if (log.captureId && !captureIds.has(log.captureId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['collectionLogs', index, 'captureId'],
          message: 'Collection log captureId must reference a known source capture'
        });
      }
    });

    if (value.evidenceSet.topicRunId !== topicRunId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['evidenceSet', 'topicRunId'],
        message: 'Evidence set topicRunId must match topicRun.id'
      });
    }

    const evidenceIds = new Set<string>();
    value.evidenceSet.items.forEach((evidence, index) => {
      evidenceIds.add(evidence.id);

      if (evidence.topicRunId !== topicRunId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['evidenceSet', 'items', index, 'topicRunId'],
          message: 'Evidence topicRunId must match topicRun.id'
        });
      }

      if (!captureIds.has(evidence.captureId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['evidenceSet', 'items', index, 'captureId'],
          message: 'Evidence captureId must reference a known source capture'
        });
      }

      evidence.supportingCaptureIds.forEach((captureId, captureIndex) => {
        if (!captureIds.has(captureId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              'evidenceSet',
              'items',
              index,
              'supportingCaptureIds',
              captureIndex
            ],
            message:
              'Evidence supportingCaptureIds must reference known source captures'
          });
        }
      });
    });

    value.artifacts.forEach((artifact, index) => {
      if (artifact.topicRunId !== topicRunId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['artifacts', index, 'topicRunId'],
          message: 'Artifact topicRunId must match topicRun.id'
        });
      }

      if (artifact.reportId && artifact.reportId !== reportId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['artifacts', index, 'reportId'],
          message: 'Artifact reportId must match report.id when present'
        });
      }
    });

    value.report.sourceIndex.forEach((sourceRef, index) => {
      if (!captureIds.has(sourceRef.captureId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['report', 'sourceIndex', index, 'captureId'],
          message: 'Report sourceIndex captureId must reference a known source capture'
        });
      }
    });

    value.report.claims.forEach((claim, index) => {
      claim.evidenceIds.forEach((evidenceId, evidenceIndex) => {
        if (!evidenceIds.has(evidenceId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['report', 'claims', index, 'evidenceIds', evidenceIndex],
            message: 'Report claim evidenceIds must reference known evidence'
          });
        }
      });
    });
  });

export type OpportunityInput = z.infer<typeof OpportunityInputSchema>;
export type CompilationPolicyCode = z.infer<typeof CompilationPolicyCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type PlanningSignalBrief = z.infer<typeof PlanningSignalBriefSchema>;
export type PlanningSignalSource = z.infer<typeof PlanningSignalSourceSchema>;
export type SignalSourceId = z.infer<typeof SignalSourceIdSchema>;
export type SignalCoverageRole = z.infer<typeof SignalCoverageRoleSchema>;
export type SignalCoverageStatus = z.infer<typeof SignalCoverageStatusSchema>;
export type OpportunityForecastSignalFamily = z.infer<
  typeof OpportunityForecastSignalFamilySchema
>;
export type OpportunityIntakeKind = z.infer<typeof OpportunityIntakeKindSchema>;
export type OpportunityResearchMode = z.infer<
  typeof OpportunityResearchModeSchema
>;
export type OpportunityIntakeProfile = z.infer<
  typeof OpportunityIntakeProfileSchema
>;
export type OpportunitySpec = z.infer<typeof OpportunitySpecSchema>;
export type TaskSpec = z.infer<typeof TaskSpecSchema>;
export type WorkflowSpec = z.infer<typeof WorkflowSpecSchema>;
export type TopicRun = z.infer<typeof TopicRunSchema>;
export type SourceCapture = z.infer<typeof SourceCaptureSchema>;
export type CollectionLog = z.infer<typeof CollectionLogSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type EvidenceSet = z.infer<typeof EvidenceSetSchema>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export type ReportClaim = z.infer<typeof ReportClaimSchema>;
export type ReportSourceRef = z.infer<typeof ReportSourceRefSchema>;
export type ReportSpec = z.infer<typeof ReportSpecSchema>;
export type ReportView = z.infer<typeof ReportViewSchema>;
export type CompilationResult = z.infer<typeof CompilationResultSchema>;
export type SearchPurpose = z.infer<typeof SearchPurposeSchema>;
export type SearchRunStatus = z.infer<typeof SearchRunStatusSchema>;
export type SearchIntent = z.infer<typeof SearchIntentSchema>;
export type SearchProviderId = z.infer<typeof SearchProviderIdSchema>;
export type SearchProviderCategory = z.infer<typeof SearchProviderCategorySchema>;
export type SearchProviderHealth = z.infer<typeof SearchProviderHealthSchema>;
export type SearchCredentialSource = z.infer<typeof SearchCredentialSourceSchema>;
export type UpgradeAction = z.infer<typeof UpgradeActionSchema>;
export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type SearchRun = z.infer<typeof SearchRunSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type UpgradeCandidate = z.infer<typeof UpgradeCandidateSchema>;
export type ProviderDiagnostic = z.infer<typeof ProviderDiagnosticSchema>;
export type DowngradeInfo = z.infer<typeof DowngradeInfoSchema>;
export type ProviderCapability = z.infer<typeof ProviderCapabilitySchema>;
export type CredentialSchema = z.infer<typeof CredentialSchemaSchema>;
export type ProviderStatus = z.infer<typeof ProviderStatusSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type CollectorDispatchRequest = z.infer<
  typeof CollectorDispatchRequestSchema
>;
export type UpgradeDispatchResult = z.infer<typeof UpgradeDispatchResultSchema>;
export type SearchRunResult = z.infer<typeof SearchRunResultSchema>;
