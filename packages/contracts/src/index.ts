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
