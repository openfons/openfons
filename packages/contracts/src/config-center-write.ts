import { z } from 'zod';
import {
  ConfigValidationResultSchema,
  PluginInstanceSchema,
  ProjectBindingSchema
} from './config-center.js';

export const RepoConfigRevisionSchema = z.object({
  etag: z.string().min(1),
  updatedAt: z.string().datetime()
});

export const PluginWriteRequestSchema = z.object({
  expectedRevision: z.string().min(1).optional(),
  dryRun: z.boolean().default(false),
  plugin: PluginInstanceSchema
});

export const ProjectBindingWriteRequestSchema = z.object({
  expectedRevision: z.string().min(1).optional(),
  dryRun: z.boolean().default(false),
  binding: ProjectBindingSchema
});

export const ConfigWriteResultSchema = z.object({
  status: z.enum(['applied', 'dry-run']),
  resource: z.enum(['plugin-instance', 'project-binding']),
  resourceId: z.string().min(1),
  changed: z.boolean(),
  revision: RepoConfigRevisionSchema,
  previousRevision: RepoConfigRevisionSchema.optional(),
  validation: ConfigValidationResultSchema,
  backupFile: z.string().min(1).optional(),
  lockWaitMs: z.number().int().nonnegative()
});

export type RepoConfigRevision = z.infer<typeof RepoConfigRevisionSchema>;
export type PluginWriteRequest = z.infer<typeof PluginWriteRequestSchema>;
export type ProjectBindingWriteRequest = z.infer<
  typeof ProjectBindingWriteRequestSchema
>;
export type ConfigWriteResult = z.infer<typeof ConfigWriteResultSchema>;
