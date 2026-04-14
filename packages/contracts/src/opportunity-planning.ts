import { z } from 'zod';

const hasMeaningfulQuestionContent = (value: string) =>
  /[\p{L}\p{N}]/u.test(value);

const SearchIntentSchema = z.enum(['decision', 'comparison', 'evaluation']);
const OpportunityForecastSignalFamilySchema = z.enum([
  'search',
  'community',
  'commercial',
  'content',
  'update'
]);

const PlanningSignalSourceSchema = z.object({
  sourceId: z.enum([
    'web',
    'reddit',
    'x',
    'youtube',
    'hacker-news',
    'polymarket',
    'bluesky',
    'tiktok',
    'instagram'
  ]),
  role: z.enum(['required', 'recommended', 'optional']),
  status: z.enum(['planned', 'covered', 'partial', 'missing']),
  rationale: z.string().min(1)
});

export const OpportunityQuestionSchema = z.object({
  question: z
    .string()
    .min(1)
    .refine(hasMeaningfulQuestionContent, {
      message: 'question must include at least one letter or number'
    }),
  marketHint: z.string().min(1).optional(),
  audienceHint: z.string().min(1).optional(),
  geoHint: z.string().min(1).optional(),
  languageHint: z.string().min(1).optional(),
  deliveryIntent: z.string().min(1).optional(),
  caseHint: z.string().min(1).optional()
});

export const PlanningRoleSchema = z.enum([
  'intent-clarifier',
  'demand-analyst',
  'competition-analyst',
  'monetization-analyst',
  'opportunity-judge'
]);

export const StructuredIntentSchema = z.object({
  keywordSeed: z.string().min(1),
  topic: z.string().min(1),
  caseKey: z.string().min(1),
  intentCandidates: z.array(z.string().min(1)).min(1),
  audienceCandidates: z.array(z.string().min(1)).min(1),
  geoCandidates: z.array(z.string().min(1)).min(1),
  languageCandidates: z.array(z.string().min(1)).min(1)
});

export const PlanningRoleBriefSchema = z.object({
  role: PlanningRoleSchema,
  summary: z.string().min(1),
  confidence: z.enum(['low', 'medium', 'high']),
  keyFindings: z.array(z.string().min(1)),
  openQuestions: z.array(z.string().min(1)),
  signalFamilies: z.array(OpportunityForecastSignalFamilySchema).min(1)
});

export const OpportunityOptionSchema = z.object({
  id: z.string().min(1),
  primaryKeyword: z.string().min(1),
  angle: z.string().min(1),
  audience: z.string().min(1),
  geo: z.string().min(1),
  language: z.string().min(1),
  searchIntent: SearchIntentSchema,
  rationale: z.string().min(1),
  riskNotes: z.array(z.string().min(1))
});

export const OpportunityApprovalSchema = z
  .object({
    status: z.enum(['pending_user_confirmation', 'confirmed']),
    selectedOptionId: z.string().min(1).optional(),
    confirmedAt: z.string().datetime().optional(),
    confirmationNotes: z.string().min(1).optional()
  })
  .superRefine((value, ctx) => {
    if (value.status !== 'confirmed') {
      return;
    }

    if (!value.selectedOptionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedOptionId'],
        message: 'Confirmed approval requires selectedOptionId'
      });
    }

    if (!value.confirmedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmedAt'],
        message: 'Confirmed approval requires confirmedAt'
      });
    }
  });

export const PlanningTraceStepSchema = z.object({
  step: z.enum([
    'structure_intent',
    'run_demand_analysis',
    'run_competition_analysis',
    'run_monetization_analysis',
    'judge_opportunity',
    'confirm_user_scope'
  ]),
  status: z.enum(['completed', 'pending', 'blocked']),
  summary: z.string().min(1)
});

export const PlanningTraceSchema = z.object({
  steps: z.array(PlanningTraceStepSchema),
  sourceCoverage: z.array(PlanningSignalSourceSchema),
  searchRunIds: z.array(z.string().min(1)),
  openQuestions: z.array(z.string().min(1)),
  contradictions: z.array(z.string().min(1))
});

export const OpportunityPlanningBundleSchema = z
  .object({
    question: OpportunityQuestionSchema,
    intent: StructuredIntentSchema,
    roleBriefs: z.array(PlanningRoleBriefSchema).min(1),
    options: z.array(OpportunityOptionSchema).min(1),
    recommendedOptionId: z.string().min(1),
    approval: OpportunityApprovalSchema,
    trace: PlanningTraceSchema
  })
  .superRefine((value, ctx) => {
    const optionIds = new Set(value.options.map((option) => option.id));

    if (!optionIds.has(value.recommendedOptionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recommendedOptionId'],
        message: 'recommendedOptionId must reference one option'
      });
    }

    if (
      value.approval.selectedOptionId &&
      !optionIds.has(value.approval.selectedOptionId)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approval', 'selectedOptionId'],
        message: 'approval.selectedOptionId must reference one option'
      });
    }
  });

export const ConfirmOpportunityRequestSchema = z.object({
  selectedOptionId: z.string().min(1),
  confirmationNotes: z.string().min(1).optional()
});

export type OpportunityQuestion = z.infer<typeof OpportunityQuestionSchema>;
export type PlanningRole = z.infer<typeof PlanningRoleSchema>;
export type StructuredIntent = z.infer<typeof StructuredIntentSchema>;
export type PlanningRoleBrief = z.infer<typeof PlanningRoleBriefSchema>;
export type OpportunityOption = z.infer<typeof OpportunityOptionSchema>;
export type OpportunityApproval = z.infer<typeof OpportunityApprovalSchema>;
export type PlanningTraceStep = z.infer<typeof PlanningTraceStepSchema>;
export type PlanningTrace = z.infer<typeof PlanningTraceSchema>;
export type OpportunityPlanningBundle = z.infer<
  typeof OpportunityPlanningBundleSchema
>;
export type ConfirmOpportunityRequest = z.infer<
  typeof ConfirmOpportunityRequestSchema
>;
