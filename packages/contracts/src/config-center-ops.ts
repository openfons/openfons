import { z } from 'zod';
import {
  ConfigValidationResultSchema,
  ProjectRouteBindingSchema
} from './config-center.js';
import { RepoConfigRevisionSchema } from './config-center-write.js';

export const ConfigCenterApiErrorCodeSchema = z.enum([
  'not-found',
  'invalid-request',
  'invalid-config',
  'revision-conflict',
  'lock-unavailable',
  'config-write-failed',
  'internal-error'
]);

export const ConfigCenterResourceSchema = z.enum([
  'plugin-instance',
  'project-binding',
  'project-route',
  'config-center'
]);

export const ConfigCenterApiErrorSchema = z.object({
  error: ConfigCenterApiErrorCodeSchema,
  message: z.string().min(1),
  resource: ConfigCenterResourceSchema.optional(),
  resourceId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  routeKey: z.string().min(1).optional(),
  retryable: z.boolean().default(false)
});

export const ConfigDoctorRouteSchema = z.object({
  routeKey: z.string().min(1),
  status: z.enum(['ready', 'degraded', 'blocked']),
  mode: ProjectRouteBindingSchema.shape.mode,
  reason: z.string().min(1)
});

export const ConfigDoctorWritePathSchema = z.object({
  configWritable: z.boolean(),
  lockDirReady: z.boolean(),
  backupDirReady: z.boolean()
});

export const ConfigDoctorReportSchema = z.object({
  projectId: z.string().min(1),
  status: z.enum(['ready', 'degraded', 'blocked']),
  bindingRevision: RepoConfigRevisionSchema,
  validation: ConfigValidationResultSchema,
  routes: z.array(ConfigDoctorRouteSchema),
  writePath: ConfigDoctorWritePathSchema
});

export const ConfigBackupHistoryEntrySchema = z.object({
  resource: ConfigCenterResourceSchema,
  resourceId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  changed: z.boolean(),
  createdAt: z.string().datetime(),
  backupFile: z.string().min(1),
  revision: RepoConfigRevisionSchema,
  previousRevision: RepoConfigRevisionSchema.optional()
});

export type ConfigCenterApiErrorCode = z.infer<
  typeof ConfigCenterApiErrorCodeSchema
>;
export type ConfigCenterResource = z.infer<typeof ConfigCenterResourceSchema>;
export type ConfigCenterApiError = z.infer<typeof ConfigCenterApiErrorSchema>;
export type ConfigDoctorRoute = z.infer<typeof ConfigDoctorRouteSchema>;
export type ConfigDoctorWritePath = z.infer<
  typeof ConfigDoctorWritePathSchema
>;
export type ConfigDoctorReport = z.infer<typeof ConfigDoctorReportSchema>;
export type ConfigBackupHistoryEntry = z.infer<
  typeof ConfigBackupHistoryEntrySchema
>;
