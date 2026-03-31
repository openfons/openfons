import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  SearchProviderIdSchema,
  type SearchProviderId,
  type SearchPurpose
} from '@openfons/contracts';

const repoRoot = path.resolve(import.meta.dirname, '../../..');

const SearchPolicySchema = z.object({
  providers: z.array(SearchProviderIdSchema),
  allowDomains: z.array(z.string().min(1)),
  denyDomains: z.array(z.string().min(1))
});

const PolicyFileSchema = z.object({
  planning: SearchPolicySchema,
  evidence: SearchPolicySchema
});

const PartialSearchPolicySchema = z.object({
  providers: z.array(SearchProviderIdSchema).optional(),
  allowDomains: z.array(z.string().min(1)).optional(),
  denyDomains: z.array(z.string().min(1)).optional()
});

const ProjectPolicyOverrideSchema = z.object({
  planning: PartialSearchPolicySchema.optional(),
  evidence: PartialSearchPolicySchema.optional()
});

export type SearchPolicy = z.infer<typeof SearchPolicySchema>;

const readJson = <T>(filePath: string): T =>
  JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;

const mergeProviders = (
  globalProviders: SearchProviderId[],
  overrideProviders?: SearchProviderId[]
): SearchProviderId[] => {
  if (!overrideProviders || overrideProviders.length === 0) {
    return globalProviders;
  }

  return [
    ...overrideProviders,
    ...globalProviders.filter((providerId) => !overrideProviders.includes(providerId))
  ];
};

export const resolveEffectiveSearchPolicy = ({
  projectId,
  purpose
}: {
  projectId: string;
  purpose: SearchPurpose;
}): SearchPolicy => {
  const globalPolicy = PolicyFileSchema.parse(
    readJson(path.join(repoRoot, 'config/search/policies/default.json'))
  )[purpose];

  const projectPolicyPath = path.join(
    repoRoot,
    `config/projects/${projectId}/search/default.json`
  );

  const projectOverride = fs.existsSync(projectPolicyPath)
    ? ProjectPolicyOverrideSchema.parse(readJson(projectPolicyPath))[purpose]
    : undefined;

  return SearchPolicySchema.parse({
    providers: mergeProviders(globalPolicy.providers, projectOverride?.providers),
    allowDomains: [
      ...new Set([
        ...globalPolicy.allowDomains,
        ...(projectOverride?.allowDomains ?? [])
      ])
    ],
    denyDomains: [
      ...new Set([
        ...globalPolicy.denyDomains,
        ...(projectOverride?.denyDomains ?? [])
      ])
    ]
  });
};
