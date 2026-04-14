import { z } from 'zod';

export const RouteReadinessStatusSchema = z.enum([
  'ready',
  'degraded',
  'blocked'
]);

export const RouteQualityTierSchema = z.enum([
  'primary',
  'fallback',
  'supplemental'
]);

export const ReadinessNoteSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1)
});

export const RouteReadinessSchema = z.object({
  sourceId: z.string().min(1),
  routeKey: z.string().min(1),
  status: RouteReadinessStatusSchema,
  qualityTier: RouteQualityTierSchema,
  requirements: z.array(ReadinessNoteSchema).default([]),
  blockers: z.array(ReadinessNoteSchema).default([]),
  warnings: z.array(ReadinessNoteSchema).default([]),
  detail: z.record(z.string(), z.unknown()).default({})
});

export const SourceReadinessSchema = z.object({
  sourceId: z.string().min(1),
  status: RouteReadinessStatusSchema,
  routes: z.array(RouteReadinessSchema).min(1),
  summary: z.string().min(1),
  updatedAt: z.string().datetime()
});

export const ProjectReadinessReportSchema = z.object({
  projectId: z.string().min(1),
  sources: z.array(SourceReadinessSchema).min(1)
});

export const RetrievalCandidateSchema = z.object({
  routeKey: z.string().min(1),
  qualityTier: RouteQualityTierSchema,
  status: RouteReadinessStatusSchema,
  priority: z.number().int(),
  penaltyReason: z.string().min(1).optional()
});

export const RetrievalOmissionSchema = z.object({
  routeKey: z.string().min(1),
  status: RouteReadinessStatusSchema,
  reason: z.string().min(1)
});

export const RetrievalPlanSchema = z.object({
  sourceId: z.string().min(1),
  planVersion: z.string().min(1),
  generatedAt: z.string().datetime(),
  candidates: z.array(RetrievalCandidateSchema),
  omissions: z.array(RetrievalOmissionSchema)
});

export const RetrievalAttemptResultSchema = z.enum([
  'succeeded',
  'failed',
  'blocked',
  'skipped'
]);

export const RetrievalAttemptSchema = z.object({
  sourceId: z.string().min(1),
  routeKey: z.string().min(1),
  attemptIndex: z.number().int().nonnegative(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  decisionBasis: z.string().min(1),
  result: RetrievalAttemptResultSchema
});

export const RetrievalOutcomeSchema = z.object({
  sourceId: z.string().min(1),
  planVersion: z.string().min(1),
  attempts: z.array(RetrievalAttemptSchema),
  selectedRoute: z.string().min(1).optional(),
  status: z.enum(['succeeded', 'partial', 'failed', 'blocked']),
  omissions: z.array(RetrievalOmissionSchema)
});

export const EvidenceAcquisitionMetaSchema = z.object({
  sourceId: z.string().min(1),
  routeKey: z.string().min(1),
  qualityTier: RouteQualityTierSchema,
  routeStatusAtAttempt: RouteReadinessStatusSchema,
  retrievalStatus: RetrievalAttemptResultSchema,
  attemptedAt: z.string().datetime(),
  decisionReason: z.string().min(1),
  warnings: z.array(ReadinessNoteSchema).default([]),
  blockers: z.array(ReadinessNoteSchema).default([])
});

export type ReadinessNote = z.infer<typeof ReadinessNoteSchema>;
export type RouteReadinessStatus = z.infer<typeof RouteReadinessStatusSchema>;
export type RouteQualityTier = z.infer<typeof RouteQualityTierSchema>;
export type RouteReadiness = z.infer<typeof RouteReadinessSchema>;
export type SourceReadiness = z.infer<typeof SourceReadinessSchema>;
export type ProjectReadinessReport = z.infer<typeof ProjectReadinessReportSchema>;
export type RetrievalCandidate = z.infer<typeof RetrievalCandidateSchema>;
export type RetrievalOmission = z.infer<typeof RetrievalOmissionSchema>;
export type RetrievalPlan = z.infer<typeof RetrievalPlanSchema>;
export type RetrievalAttemptResult = z.infer<
  typeof RetrievalAttemptResultSchema
>;
export type RetrievalAttempt = z.infer<typeof RetrievalAttemptSchema>;
export type RetrievalOutcome = z.infer<typeof RetrievalOutcomeSchema>;
export type EvidenceAcquisitionMeta = z.infer<
  typeof EvidenceAcquisitionMetaSchema
>;
