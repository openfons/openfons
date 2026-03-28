import { z } from 'zod';

export const OpportunityInputSchema = z.object({
  title: z.string().min(1),
  query: z.string().min(1),
  market: z.string().min(1),
  audience: z.string().min(1),
  problem: z.string().min(1),
  outcome: z.string().min(1)
});

export const OpportunityStatusSchema = z.enum(['draft', 'compiled']);
export const TaskKindSchema = z.enum([
  'collect-evidence',
  'score-opportunity',
  'render-report'
]);
export const TaskStatusSchema = z.enum(['queued', 'ready']);
export const WorkflowStatusSchema = z.enum(['draft', 'ready']);

export const OpportunitySpecSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  market: z.string().min(1),
  input: OpportunityInputSchema,
  status: OpportunityStatusSchema,
  createdAt: z.string().datetime()
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

export const ReportSpecSchema = z.object({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  sections: z.array(ReportSectionSchema).min(1),
  createdAt: z.string().datetime()
});

export const CompilationResultSchema = z.object({
  opportunity: OpportunitySpecSchema,
  tasks: z.array(TaskSpecSchema).length(3),
  workflow: WorkflowSpecSchema,
  report: ReportSpecSchema
});

export type OpportunityInput = z.infer<typeof OpportunityInputSchema>;
export type OpportunitySpec = z.infer<typeof OpportunitySpecSchema>;
export type TaskSpec = z.infer<typeof TaskSpecSchema>;
export type WorkflowSpec = z.infer<typeof WorkflowSpecSchema>;
export type ReportSpec = z.infer<typeof ReportSpecSchema>;
export type CompilationResult = z.infer<typeof CompilationResultSchema>;
