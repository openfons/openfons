import { z } from 'zod';

export const PluginTypeIdSchema = z.enum([
  'search-provider',
  'browser-runtime',
  'crawler-adapter',
  'account-source',
  'cookie-source',
  'proxy-source'
]);

export const SecretScopeSchema = z.enum(['project', 'global']);

export const SecretRefSchema = z
  .object({
    scheme: z.literal('secret'),
    scope: SecretScopeSchema,
    projectId: z.string().min(1).optional(),
    name: z.string().min(1)
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'project' && !value.projectId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['projectId'],
        message: 'project scope secret refs must include projectId'
      });
    }
  });

export const PluginDependencySchema = z.object({
  type: PluginTypeIdSchema,
  pluginId: z.string().min(1)
});

export const PluginTypeSchema = z.object({
  id: PluginTypeIdSchema,
  displayName: z.string().min(1),
  description: z.string().min(1),
  allowDrivers: z.array(z.string().min(1)).min(1),
  allowDependencies: z.array(PluginTypeIdSchema)
});

export const PluginSpecSchema = z.object({
  type: PluginTypeIdSchema,
  driver: z.string().min(1),
  requiredConfigFields: z.array(z.string().min(1)),
  optionalConfigFields: z.array(z.string().min(1)),
  secretFields: z.array(z.string().min(1)),
  allowedDependencyTypes: z.array(PluginTypeIdSchema),
  healthCheckKinds: z.array(z.string().min(1))
});

const ConfigRecordMetaSchema = z.object({
  updatedAt: z.string().datetime(),
  updatedBy: z.string().min(1).optional()
});

export const PluginInstanceSchema = z.object({
  id: z.string().min(1),
  type: PluginTypeIdSchema,
  driver: z.string().min(1),
  enabled: z.boolean(),
  scope: z.enum(['global', 'project']).default('global'),
  config: z.record(z.string(), z.unknown()).default({}),
  secrets: z.record(z.string(), SecretRefSchema).default({}),
  dependencies: z.array(PluginDependencySchema).default([]),
  policy: z.record(z.string(), z.unknown()).default({}),
  meta: ConfigRecordMetaSchema.optional(),
  healthCheck: z
    .object({
      kind: z.string().min(1),
      timeoutMs: z.number().int().positive().optional()
    })
    .optional()
});

export const ProjectRouteBindingSchema = z.object({
  discovery: z.array(z.string().min(1)).optional(),
  browser: z.string().min(1).optional(),
  collection: z.string().min(1).optional(),
  accounts: z.array(z.string().min(1)).optional(),
  cookies: z.array(z.string().min(1)).optional(),
  proxy: z.string().min(1).optional(),
  mode: z.enum(['public-first', 'requires-auth'])
});

export const ProjectBindingSchema = z.object({
  projectId: z.string().min(1),
  enabledPlugins: z.array(z.string().min(1)),
  roles: z.record(
    z.string(),
    z.union([z.string().min(1), z.array(z.string().min(1))])
  ),
  routes: z.record(z.string(), ProjectRouteBindingSchema),
  overrides: z.record(z.string(), z.unknown()).default({}),
  meta: ConfigRecordMetaSchema.optional()
});

export const ConfigIssueSchema = z.object({
  severity: z.enum(['block', 'degrade', 'warn', 'skip']),
  code: z.string().min(1),
  pluginId: z.string().min(1).optional(),
  field: z.string().min(1).optional(),
  message: z.string().min(1)
});

export const ConfigValidationResultSchema = z.object({
  status: z.enum(['valid', 'degraded', 'invalid']),
  errors: z.array(ConfigIssueSchema).default([]),
  warnings: z.array(ConfigIssueSchema).default([]),
  skipped: z.array(ConfigIssueSchema).default([]),
  checkedPluginIds: z.array(z.string().min(1)).default([])
});

export const ResolvedSecretValueSchema = z.object({
  valueSource: z.enum(['secret', 'inline']),
  configured: z.literal(true),
  value: z.unknown()
});

export const MaskedSecretValueSchema = z.object({
  valueSource: z.enum(['secret', 'inline', 'none']),
  configured: z.boolean(),
  resolved: z.boolean(),
  summary: z.string().min(1).optional()
});

const ResolvedPluginBaseSchema = z.object({
  pluginId: z.string().min(1),
  type: PluginTypeIdSchema,
  driver: z.string().min(1),
  config: z.record(z.string(), z.unknown()).default({})
});

export const ResolvedPluginRuntimeSchema = ResolvedPluginBaseSchema.extend({
  secrets: z.record(z.string(), ResolvedSecretValueSchema).default({})
});

export const MaskedResolvedPluginRuntimeSchema = ResolvedPluginBaseSchema.extend({
  secrets: z.record(z.string(), MaskedSecretValueSchema).default({})
});

const ResolvedRoleValueSchema = z.union([
  ResolvedPluginRuntimeSchema,
  z.array(ResolvedPluginRuntimeSchema)
]);

const MaskedResolvedRoleValueSchema = z.union([
  MaskedResolvedPluginRuntimeSchema,
  z.array(MaskedResolvedPluginRuntimeSchema)
]);

export const ResolvedRouteRuntimeSchema = z.object({
  mode: z.enum(['public-first', 'requires-auth']),
  discovery: z.array(ResolvedPluginRuntimeSchema).optional(),
  browser: ResolvedPluginRuntimeSchema.optional(),
  collection: ResolvedPluginRuntimeSchema.optional(),
  accounts: z.array(ResolvedPluginRuntimeSchema).optional(),
  cookies: z.array(ResolvedPluginRuntimeSchema).optional(),
  proxy: ResolvedPluginRuntimeSchema.optional()
});

export const MaskedResolvedRouteRuntimeSchema = z.object({
  mode: z.enum(['public-first', 'requires-auth']),
  discovery: z.array(MaskedResolvedPluginRuntimeSchema).optional(),
  browser: MaskedResolvedPluginRuntimeSchema.optional(),
  collection: MaskedResolvedPluginRuntimeSchema.optional(),
  accounts: z.array(MaskedResolvedPluginRuntimeSchema).optional(),
  cookies: z.array(MaskedResolvedPluginRuntimeSchema).optional(),
  proxy: MaskedResolvedPluginRuntimeSchema.optional()
});

export const ResolvedRuntimeConfigSchema = z.object({
  projectId: z.string().min(1),
  roles: z.record(z.string(), ResolvedRoleValueSchema),
  routes: z.record(z.string(), ResolvedRouteRuntimeSchema)
});

export const MaskedResolvedRuntimeConfigSchema = z.object({
  projectId: z.string().min(1),
  roles: z.record(z.string(), MaskedResolvedRoleValueSchema),
  routes: z.record(z.string(), MaskedResolvedRouteRuntimeSchema)
});

export type PluginTypeId = z.infer<typeof PluginTypeIdSchema>;
export type SecretRef = z.infer<typeof SecretRefSchema>;
export type PluginDependency = z.infer<typeof PluginDependencySchema>;
export type PluginType = z.infer<typeof PluginTypeSchema>;
export type PluginSpec = z.infer<typeof PluginSpecSchema>;
export type PluginInstance = z.infer<typeof PluginInstanceSchema>;
export type ProjectRouteBinding = z.infer<typeof ProjectRouteBindingSchema>;
export type ProjectBinding = z.infer<typeof ProjectBindingSchema>;
export type ConfigIssue = z.infer<typeof ConfigIssueSchema>;
export type ConfigValidationResult = z.infer<
  typeof ConfigValidationResultSchema
>;
export type ResolvedSecretValue = z.infer<typeof ResolvedSecretValueSchema>;
export type MaskedSecretValue = z.infer<typeof MaskedSecretValueSchema>;
export type ResolvedPluginRuntime = z.infer<typeof ResolvedPluginRuntimeSchema>;
export type MaskedResolvedPluginRuntime = z.infer<
  typeof MaskedResolvedPluginRuntimeSchema
>;
export type ResolvedRouteRuntime = z.infer<typeof ResolvedRouteRuntimeSchema>;
export type MaskedResolvedRouteRuntime = z.infer<
  typeof MaskedResolvedRouteRuntimeSchema
>;
export type ResolvedRuntimeConfig = z.infer<typeof ResolvedRuntimeConfigSchema>;
export type MaskedResolvedRuntimeConfig = z.infer<
  typeof MaskedResolvedRuntimeConfigSchema
>;
