import { z } from 'zod';

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
  productOpportunityHints: z.array(ProductOpportunityHintSchema)
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
  sections: z.array(ReportSectionSchema).min(1),
  evidenceBoundaries: z.array(z.string().min(1)).min(1),
  risks: z.array(z.string().min(1)).min(1),
  updateLog: z.array(UpdateLogEntrySchema).min(1),
  createdAt: z.string().datetime()
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
    report: ReportSpecSchema
  })
  .superRefine((value, ctx) => {
    const opportunityId = value.opportunity.id;

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
  });

export type OpportunityInput = z.infer<typeof OpportunityInputSchema>;
export type OpportunitySpec = z.infer<typeof OpportunitySpecSchema>;
export type TaskSpec = z.infer<typeof TaskSpecSchema>;
export type WorkflowSpec = z.infer<typeof WorkflowSpecSchema>;
export type ReportSpec = z.infer<typeof ReportSpecSchema>;
export type CompilationResult = z.infer<typeof CompilationResultSchema>;
export type SearchPurpose = z.infer<typeof SearchPurposeSchema>;
export type SearchRunStatus = z.infer<typeof SearchRunStatusSchema>;
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
