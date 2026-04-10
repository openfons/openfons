import { z } from 'zod';

export const RuntimeCheckStatusSchema = z.enum([
  'ok',
  'missing',
  'placeholder',
  'invalid',
  'skipped'
]);

export const RuntimePreflightStatusSchema = z.enum(['ready', 'blocked']);

export const RuntimePreflightCheckSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  status: RuntimeCheckStatusSchema,
  message: z.string().min(1),
  command: z.string().min(1).optional(),
  envVar: z.string().min(1).optional(),
  filePath: z.string().min(1).optional(),
  candidatePaths: z.array(z.string().min(1)).default([]),
  pluginId: z.string().min(1).optional(),
  field: z.string().min(1).optional()
});

export const RuntimeBootstrapActionSchema = z.object({
  key: z.string().min(1),
  status: z.enum(['created', 'skipped', 'failed']),
  path: z.string().min(1).optional(),
  message: z.string().min(1)
});

export const CrawlerRouteSummarySchema = z.object({
  routeKey: z.string().min(1),
  mode: z.enum(['public-first', 'requires-auth']),
  driver: z.string().min(1),
  collectionPluginId: z.string().min(1)
});

export const CrawlerRoutePreflightReportSchema = z.object({
  projectId: z.string().min(1),
  routeKey: z.string().min(1),
  secretRoot: z.string().min(1),
  status: RuntimePreflightStatusSchema,
  route: CrawlerRouteSummarySchema.nullable(),
  hostChecks: z.array(RuntimePreflightCheckSchema),
  secretChecks: z.array(RuntimePreflightCheckSchema),
  bootstrapActions: z.array(RuntimeBootstrapActionSchema).default([]),
  nextSteps: z.array(z.string().min(1)).default([])
});

export type RuntimeCheckStatus = z.infer<typeof RuntimeCheckStatusSchema>;
export type RuntimePreflightStatus = z.infer<
  typeof RuntimePreflightStatusSchema
>;
export type RuntimePreflightCheck = z.infer<
  typeof RuntimePreflightCheckSchema
>;
export type RuntimeBootstrapAction = z.infer<
  typeof RuntimeBootstrapActionSchema
>;
export type CrawlerRouteSummary = z.infer<typeof CrawlerRouteSummarySchema>;
export type CrawlerRoutePreflightReport = z.infer<
  typeof CrawlerRoutePreflightReportSchema
>;
