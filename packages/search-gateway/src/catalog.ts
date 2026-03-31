import fs from 'node:fs';
import path from 'node:path';
import {
  CredentialSchemaSchema,
  ProviderCapabilitySchema,
  ProviderStatusSchema,
  ValidationResultSchema,
  type CredentialSchema,
  type ProviderCapability,
  type ProviderStatus,
  type ValidationResult
} from '@openfons/contracts';

const repoRoot = path.resolve(import.meta.dirname, '../../..');
const providersDir = path.join(repoRoot, 'config/search/providers');
const credentialSchemaPath = path.join(
  repoRoot,
  'config/search/credentials.schema.json'
);

const readJson = <T>(filePath: string): T =>
  JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;

export const loadProviderCatalog = (): ProviderCapability[] =>
  fs
    .readdirSync(providersDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) =>
      ProviderCapabilitySchema.parse(
        readJson(path.join(providersDir, name))
      )
    )
    .sort((a, b) => a.defaultPriority - b.defaultPriority);

export const loadCredentialSchemas = (): CredentialSchema[] =>
  CredentialSchemaSchema.array().parse(readJson(credentialSchemaPath));

export const getProviderStatus = (projectId?: string): ProviderStatus[] => {
  const catalog = loadProviderCatalog();
  const credentialSchemas = loadCredentialSchemas();

  return catalog.map((provider) => {
    const schema = credentialSchemas.find(
      (item) => item.providerId === provider.providerId
    );
    const requiredFields = schema?.requiredFields ?? [];
    const systemSatisfied = requiredFields.every((field) =>
      Boolean(
        process.env[
          `${provider.providerId.toUpperCase()}_${field.toUpperCase()}`
        ]
      )
    );
    const projectSatisfied = projectId
      ? requiredFields.every((field) =>
          Boolean(
            process.env[
              `${projectId.toUpperCase()}_${provider.providerId.toUpperCase()}_${field.toUpperCase()}`
            ]
          )
        )
      : false;

    return ProviderStatusSchema.parse({
      providerId: provider.providerId,
      enabled: provider.enabledByDefault,
      healthy: !provider.requiresCredential || projectSatisfied || systemSatisfied,
      credentialResolvedFrom: !provider.requiresCredential
        ? 'none'
        : projectSatisfied
          ? 'project'
          : systemSatisfied
            ? 'system'
            : 'none',
      degraded:
        provider.requiresCredential && !projectSatisfied && !systemSatisfied,
      reason:
        provider.requiresCredential && !projectSatisfied && !systemSatisfied
          ? 'missing-credential'
          : undefined
    });
  });
};

export const validateSearchConfig = (projectId?: string): ValidationResult => {
  const resolvedProviders = getProviderStatus(projectId);

  return ValidationResultSchema.parse({
    valid: resolvedProviders.every((provider) => provider.healthy),
    errors: resolvedProviders
      .filter((provider) => !provider.healthy)
      .map((provider) => `${provider.providerId}: missing credential`),
    warnings: [],
    resolvedProviders
  });
};
