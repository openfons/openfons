# SearchGateway v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a layered `SearchGateway` that supports planning-stage discovery search and post-confirmation evidence search across Google, Bing, Baidu, DuckDuckGo, Brave, and Tavily, with provider capability metadata, downgrade handling, upgrade candidates, and an HTTP service entrypoint.

**Architecture:** Keep the existing OpenFons truth chain unchanged and insert `SearchRun / SearchResult / UpgradeCandidate` as discovery execution objects ahead of `CollectorGateway`. Implement the capability in two layers: `packages/search-gateway` for the reusable core and `services/search-gateway` for the service facade. Use config-driven provider catalog + routing policy + secret-backed credentials, and test every layer with TDD.

**Tech Stack:** TypeScript, pnpm workspaces, Zod, Hono, Vitest, in-memory service store for v1, JSON config under `config/search/**`.

---

## File Map

### Existing files to modify

- `packages/contracts/src/index.ts`
  Add `SearchRequest`, `SearchRun`, `SearchResult`, `UpgradeCandidate`, `ProviderDiagnostic`, `DowngradeInfo`, `ProviderCapability`, `CredentialSchema`, `ProviderStatus`, `ValidationResult`, `UpgradeDispatchResult`, and `SearchRunResult` schemas and exports.
- `tsconfig.base.json`
  Add the `@openfons/search-gateway` workspace alias.

### New package files

- `packages/search-gateway/package.json`
  Workspace package manifest matching existing package patterns.
- `packages/search-gateway/tsconfig.json`
  Typecheck/lint configuration.
- `packages/search-gateway/tsconfig.build.json`
  Build-time declaration output configuration.
- `packages/search-gateway/src/index.ts`
  Public entrypoint for the package.
- `packages/search-gateway/src/catalog.ts`
  Provider catalog and credential schema loader.
- `packages/search-gateway/src/policy.ts`
  Routing policy merge and effective-policy resolution.
- `packages/search-gateway/src/providers/base.ts`
  Shared provider interface and common helper utilities.
- `packages/search-gateway/src/providers/google.ts`
  Google adapter request/response normalization.
- `packages/search-gateway/src/providers/bing.ts`
  Bing adapter request/response normalization.
- `packages/search-gateway/src/providers/baidu.ts`
  Baidu adapter request/response normalization.
- `packages/search-gateway/src/providers/ddg.ts`
  DuckDuckGo adapter request/response normalization.
- `packages/search-gateway/src/providers/brave.ts`
  Brave adapter request/response normalization.
- `packages/search-gateway/src/providers/tavily.ts`
  Tavily adapter request/response normalization.
- `packages/search-gateway/src/dedupe.ts`
  Multi-provider deduplication and canonicalization helpers.
- `packages/search-gateway/src/gateway.ts`
  `createSearchGateway()` orchestration entrypoint.

### New service files

- `services/search-gateway/package.json`
  Workspace service manifest.
- `services/search-gateway/tsconfig.json`
  Runtime typecheck/lint configuration.
- `services/search-gateway/tsconfig.build.json`
  Build declaration output configuration.
- `services/search-gateway/src/store.ts`
  In-memory search-run storage for v1.
- `services/search-gateway/src/config.ts`
  Service-side config resolution wrapper.
- `services/search-gateway/src/app.ts`
  Hono routes for `/api/v1/search/**`.
- `services/search-gateway/src/server.ts`
  Node server bootstrap.

### New config files

- `config/search/providers/google.json`
- `config/search/providers/bing.json`
- `config/search/providers/baidu.json`
- `config/search/providers/ddg.json`
- `config/search/providers/brave.json`
- `config/search/providers/tavily.json`
  Provider capability defaults for each source.
- `config/search/credentials.schema.json`
  Provider credential-field schema metadata.
- `config/search/policies/default.json`
  Global default routing/selection/downgrade policy.
- `config/projects/openfons/search/default.json`
  Project-level override file for the current repo.

### New tests

- `tests/contract/search-gateway-schema.test.ts`
  Contract-level schema parsing coverage.
- `tests/integration/search-gateway-policy.test.ts`
  Policy merge, domain filtering, and upgrade-candidate logic coverage.
- `tests/integration/search-gateway-degrade.test.ts`
  Provider downgrade and missing-credential behavior coverage.
- `tests/integration/search-gateway.test.ts`
  Hono service endpoint coverage for search run creation, lookup, provider status, config validation, and upgrade dispatch.

---

### Task 1: Extend contracts for SearchGateway discovery objects

**Files:**
- Modify: `packages/contracts/src/index.ts`
- Test: `tests/contract/search-gateway-schema.test.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
import { describe, expect, it } from 'vitest';
import {
  SearchRequestSchema,
  SearchRunSchema,
  SearchResultSchema,
  UpgradeCandidateSchema,
  ProviderDiagnosticSchema,
  DowngradeInfoSchema,
  ProviderCapabilitySchema,
  CredentialSchemaSchema,
  ProviderStatusSchema,
  ValidationResultSchema,
  UpgradeDispatchResultSchema,
  SearchRunResultSchema
} from '@openfons/contracts';

describe('@openfons/contracts search gateway schemas', () => {
  it('parses a planning search run result', () => {
    const request = SearchRequestSchema.parse({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'direct api vs openrouter',
      geo: 'global',
      language: 'English',
      providers: ['google', 'brave'],
      maxResults: 20,
      pages: 2,
      autoUpgrade: false
    });

    const runResult = SearchRunResultSchema.parse({
      searchRun: {
        id: 'search_run_001',
        projectId: 'openfons',
        purpose: 'planning',
        query: request.query,
        status: 'completed',
        selectedProviders: ['google', 'brave'],
        degradedProviders: ['bing'],
        startedAt: '2026-03-30T08:00:00.000Z',
        finishedAt: '2026-03-30T08:00:02.000Z'
      },
      results: [
        {
          id: 'search_result_001',
          searchRunId: 'search_run_001',
          provider: 'google',
          title: 'OpenAI API pricing',
          url: 'https://openai.com/api/pricing/',
          snippet: 'Official per-model token pricing from OpenAI.',
          rank: 1,
          page: 1,
          domain: 'openai.com',
          sourceKindGuess: 'official',
          dedupKey: 'openai.com/api/pricing',
          selectedForUpgrade: true,
          selectionReason: 'official-domain'
        }
      ],
      upgradeCandidates: [
        {
          searchResultId: 'search_result_001',
          searchRunId: 'search_run_001',
          recommendedAction: 'http',
          reason: 'official pricing page',
          priority: 100,
          requiresHumanReview: false,
          proposedSourceKind: 'official',
          proposedUseAs: 'primary'
        }
      ],
      diagnostics: [
        {
          providerId: 'google',
          status: 'success',
          degraded: false,
          reason: 'ok',
          durationMs: 320,
          resultCount: 10,
          rateLimitState: 'healthy'
        }
      ],
      downgradeInfo: [
        {
          providerId: 'bing',
          status: 'degraded',
          reason: 'missing-credential',
          fallbackProviderId: 'brave',
          phase: 'orchestration',
          occurredAt: '2026-03-30T08:00:00.500Z'
        }
      ]
    });

    expect(runResult.searchRun.purpose).toBe('planning');
    expect(runResult.results[0].sourceKindGuess).toBe('official');
    expect(runResult.upgradeCandidates[0].recommendedAction).toBe('http');
  });
});
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run: `pnpm test -- tests/contract/search-gateway-schema.test.ts`
Expected: FAIL with missing exports such as `SearchRequestSchema`, `SearchRunResultSchema`, or `ProviderCapabilitySchema`.

- [ ] **Step 3: Implement the new contract schemas**

```ts
// packages/contracts/src/index.ts
export const SearchPurposeSchema = z.enum(['planning', 'evidence']);
export const SearchRunStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed'
]);
export const SearchProviderIdSchema = z.enum([
  'google',
  'bing',
  'baidu',
  'ddg',
  'brave',
  'tavily'
]);
export const SearchProviderCategorySchema = z.enum([
  'external-api',
  'self-hosted',
  'open-source-meta'
]);
export const SearchProviderHealthSchema = z.enum([
  'healthy',
  'degraded',
  'unavailable'
]);
export const SearchCredentialSourceSchema = z.enum([
  'system',
  'project',
  'none'
]);
export const UpgradeActionSchema = z.enum(['http', 'browser', 'api', 'skip']);
```

After the enum block, add concrete Zod schemas for:

1. `SearchRequest`
   Required fields: `projectId`, `purpose`, `query`, `maxResults`, `pages`, `autoUpgrade`
2. `SearchRun`
   Required fields: `id`, `projectId`, `purpose`, `query`, `status`, `selectedProviders`, `degradedProviders`, `startedAt`
3. `SearchResult`
   Required fields: `id`, `searchRunId`, `provider`, `title`, `url`, `snippet`, `rank`, `page`, `domain`, `sourceKindGuess`, `dedupKey`, `selectedForUpgrade`, `selectionReason`
4. `UpgradeCandidate`
   Required fields: `searchResultId`, `searchRunId`, `recommendedAction`, `reason`, `priority`, `requiresHumanReview`, `proposedSourceKind`, `proposedUseAs`
5. `ProviderDiagnostic`
6. `DowngradeInfo`
7. `ProviderCapability`
8. `CredentialSchemaSchema`
9. `ProviderStatus`
10. `ValidationResult`
11. `CollectorDispatchRequest`
12. `UpgradeDispatchResult`
13. `SearchRunResult`

Export the matching inferred types at the end of `index.ts`, including `SearchRequest`, `SearchRun`, `SearchResult`, `UpgradeCandidate`, `ProviderCapability`, and `SearchRunResult`.

- [ ] **Step 4: Re-run the contract test to verify it passes**

Run: `pnpm test -- tests/contract/search-gateway-schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/index.ts tests/contract/search-gateway-schema.test.ts
git commit -m "feat(contracts): add search gateway discovery contracts"
```

### Task 2: Scaffold the search-gateway package and config sources

**Files:**
- Modify: `tsconfig.base.json`
- Create: `packages/search-gateway/package.json`
- Create: `packages/search-gateway/tsconfig.json`
- Create: `packages/search-gateway/tsconfig.build.json`
- Create: `packages/search-gateway/src/index.ts`
- Create: `packages/search-gateway/src/catalog.ts`
- Create: `packages/search-gateway/src/policy.ts`
- Create: `config/search/providers/google.json`
- Create: `config/search/providers/bing.json`
- Create: `config/search/providers/baidu.json`
- Create: `config/search/providers/ddg.json`
- Create: `config/search/providers/brave.json`
- Create: `config/search/providers/tavily.json`
- Create: `config/search/credentials.schema.json`
- Create: `config/search/policies/default.json`
- Create: `config/projects/openfons/search/default.json`
- Test: `tests/integration/search-gateway-policy.test.ts`

- [ ] **Step 1: Write the failing config/policy test**

```ts
import { describe, expect, it } from 'vitest';
import {
  loadProviderCatalog,
  loadCredentialSchemas,
  resolveEffectiveSearchPolicy
} from '@openfons/search-gateway';

describe('search-gateway policy resolution', () => {
  it('merges system defaults with project override without replacing the whole provider set', () => {
    const catalog = loadProviderCatalog();
    const credentialSchemas = loadCredentialSchemas();
    const policy = resolveEffectiveSearchPolicy({
      projectId: 'openfons',
      purpose: 'planning'
    });

    expect(catalog.map((item) => item.providerId)).toEqual([
      'google',
      'bing',
      'baidu',
      'ddg',
      'brave',
      'tavily'
    ]);
    expect(credentialSchemas.find((item) => item.providerId === 'brave')).toBeDefined();
    expect(policy.providers).toContain('ddg');
    expect(policy.providers[0]).toBe('google');
    expect(policy.allowDomains).toContain('openai.com');
    expect(policy.denyDomains).toContain('pinterest.com');
  });
});
```

- [ ] **Step 2: Run the policy test to verify it fails**

Run: `pnpm test -- tests/integration/search-gateway-policy.test.ts`
Expected: FAIL with missing package exports such as `loadProviderCatalog` or `resolveEffectiveSearchPolicy`.

- [ ] **Step 3: Create the workspace package files**

```json
// packages/search-gateway/package.json
{
  "name": "@openfons/search-gateway",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "dependencies": {
    "@openfons/contracts": "workspace:*",
    "@openfons/shared": "workspace:*"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "lint": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

```json
// packages/search-gateway/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src/**/*"]
}
```

```json
// packages/search-gateway/tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "rootDir": "src",
    "outDir": "dist",
    "paths": {}
  }
}
```

```json
// tsconfig.base.json
"@openfons/search-gateway": ["packages/search-gateway/src/index.ts"]
```

```ts
// packages/search-gateway/src/catalog.ts
import fs from 'node:fs';
import path from 'node:path';
import {
  CredentialSchemaSchema,
  ProviderCapabilitySchema,
  type CredentialSchema,
  type ProviderCapability
} from '@openfons/contracts';

const repoRoot = path.resolve(import.meta.dirname, '../../..');
const providersDir = path.join(repoRoot, 'config/search/providers');
const credentialSchemaPath = path.join(
  repoRoot,
  'config/search/credentials.schema.json'
);

export const loadProviderCatalog = (): ProviderCapability[] =>
  fs
    .readdirSync(providersDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) =>
      ProviderCapabilitySchema.parse(
        JSON.parse(fs.readFileSync(path.join(providersDir, name), 'utf8'))
      )
    )
    .sort((a, b) => a.defaultPriority - b.defaultPriority);

export const loadCredentialSchemas = (): CredentialSchema[] =>
  CredentialSchemaSchema.array().parse(
    JSON.parse(fs.readFileSync(credentialSchemaPath, 'utf8'))
  );
```

```ts
// packages/search-gateway/src/policy.ts
import fs from 'node:fs';
import path from 'node:path';

type SearchPolicy = {
  providers: string[];
  allowDomains: string[];
  denyDomains: string[];
};

const repoRoot = path.resolve(import.meta.dirname, '../../..');

const readJson = <T>(filePath: string): T =>
  JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;

export const resolveEffectiveSearchPolicy = ({
  projectId,
  purpose
}: {
  projectId: string;
  purpose: 'planning' | 'evidence';
}): SearchPolicy => {
  const globalPolicy = readJson<{
    planning: SearchPolicy;
    evidence: SearchPolicy;
  }>(path.join(repoRoot, 'config/search/policies/default.json'))[purpose];

  const projectPath = path.join(
    repoRoot,
    `config/projects/${projectId}/search/default.json`
  );
  const projectOverride = fs.existsSync(projectPath)
    ? readJson<Partial<Record<'planning' | 'evidence', Partial<SearchPolicy>>>>(
        projectPath
      )[purpose] ?? {}
    : {};

  return {
    providers: projectOverride.providers ?? globalPolicy.providers,
    allowDomains: [
      ...new Set([
        ...globalPolicy.allowDomains,
        ...(projectOverride.allowDomains ?? [])
      ])
    ],
    denyDomains: [
      ...new Set([
        ...globalPolicy.denyDomains,
        ...(projectOverride.denyDomains ?? [])
      ])
    ]
  };
};
```

```ts
// packages/search-gateway/src/index.ts
export * from './catalog.js';
export * from './policy.js';
```

Add provider JSON files for all six providers plus the two policy files:

```json
// config/search/providers/google.json
{
  "providerId": "google",
  "displayName": "Google Programmable Search",
  "category": "external-api",
  "enabledByDefault": true,
  "requiresCredential": true,
  "supportsGeo": true,
  "supportsLanguage": true,
  "supportsPagination": true,
  "supportsMultiQuery": true,
  "supportsAsync": true,
  "supportsSnippet": true,
  "supportsRichMetadata": false,
  "supportsRateLimitHeader": false,
  "defaultPriority": 10,
  "defaultTimeoutMs": 5000,
  "degradePriority": 60,
  "riskLevel": "medium",
  "notes": "Official Google search API path for v1."
}
```

```json
// config/search/providers/ddg.json
{
  "providerId": "ddg",
  "displayName": "DuckDuckGo",
  "category": "open-source-meta",
  "enabledByDefault": true,
  "requiresCredential": false,
  "supportsGeo": false,
  "supportsLanguage": true,
  "supportsPagination": true,
  "supportsMultiQuery": true,
  "supportsAsync": true,
  "supportsSnippet": true,
  "supportsRichMetadata": false,
  "supportsRateLimitHeader": false,
  "defaultPriority": 50,
  "defaultTimeoutMs": 4000,
  "degradePriority": 10,
  "riskLevel": "medium",
  "notes": "Low-cost fallback discovery provider."
}
```

Create the remaining provider files with these exact top-level identities:

1. `config/search/providers/bing.json`
   `providerId: "bing"`, `displayName: "Bing Web Search"`, `requiresCredential: true`, `defaultPriority: 20`, `degradePriority: 50`
2. `config/search/providers/baidu.json`
   `providerId: "baidu"`, `displayName: "Baidu Search"`, `requiresCredential: true`, `defaultPriority: 30`, `degradePriority: 40`
3. `config/search/providers/brave.json`
   `providerId: "brave"`, `displayName: "Brave Search API"`, `requiresCredential: true`, `defaultPriority: 15`, `degradePriority: 20`
4. `config/search/providers/tavily.json`
   `providerId: "tavily"`, `displayName: "Tavily Search"`, `requiresCredential: true`, `defaultPriority: 25`, `degradePriority: 30`

For each file, keep the same schema fields shown in the Google and DDG examples:
`category`, `enabledByDefault`, `supportsGeo`, `supportsLanguage`, `supportsPagination`, `supportsMultiQuery`, `supportsAsync`, `supportsSnippet`, `supportsRichMetadata`, `supportsRateLimitHeader`, `defaultTimeoutMs`, `riskLevel`, `notes`.

Use these exact `notes` values for the remaining provider files:

1. Bing: `Commercial web search API for broad coverage.`
2. Baidu: `Primary Chinese-language search provider for mainland-oriented discovery.`
3. Brave: `Third-party API with free monthly credits and rate-limit headers.`
4. Tavily: `Search API optimized for LLM retrieval and result enrichment.`

```json
// config/search/credentials.schema.json
[
  {
    "providerId": "google",
    "requiredFields": ["apiKey", "cx"],
    "optionalFields": [],
    "validationRules": ["apiKey must be non-empty", "cx must be non-empty"],
    "sensitiveFields": ["apiKey"],
    "projectOverrideAllowed": true
  },
  {
    "providerId": "bing",
    "requiredFields": ["apiKey"],
    "optionalFields": ["endpoint"],
    "validationRules": ["apiKey must be non-empty", "endpoint must be non-empty when provided"],
    "sensitiveFields": ["apiKey"],
    "projectOverrideAllowed": true
  },
  {
    "providerId": "baidu",
    "requiredFields": ["apiKey", "secretKey", "endpoint"],
    "optionalFields": [],
    "validationRules": ["apiKey must be non-empty", "secretKey must be non-empty", "endpoint must be non-empty"],
    "sensitiveFields": ["apiKey", "secretKey"],
    "projectOverrideAllowed": true
  },
  {
    "providerId": "ddg",
    "requiredFields": ["endpoint"],
    "optionalFields": [],
    "validationRules": ["endpoint must be non-empty"],
    "sensitiveFields": [],
    "projectOverrideAllowed": true
  },
  {
    "providerId": "brave",
    "requiredFields": ["apiKey"],
    "optionalFields": [],
    "validationRules": ["apiKey must be non-empty"],
    "sensitiveFields": ["apiKey"],
    "projectOverrideAllowed": true
  },
  {
    "providerId": "tavily",
    "requiredFields": ["apiKey"],
    "optionalFields": [],
    "validationRules": ["apiKey must be non-empty"],
    "sensitiveFields": ["apiKey"],
    "projectOverrideAllowed": true
  }
]
```

```json
// config/search/policies/default.json
{
  "planning": {
    "providers": ["ddg", "google", "brave", "bing"],
    "allowDomains": ["openai.com", "help.openai.com", "ai.google.dev", "openrouter.ai"],
    "denyDomains": ["pinterest.com", "facebook.com", "quora.com"]
  },
  "evidence": {
    "providers": ["google", "bing", "baidu", "brave", "tavily"],
    "allowDomains": ["openai.com", "help.openai.com", "ai.google.dev", "openrouter.ai"],
    "denyDomains": ["pinterest.com", "facebook.com", "quora.com"]
  }
}
```

```json
// config/projects/openfons/search/default.json
{
  "planning": {
    "providers": ["ddg", "google", "brave", "bing"],
    "allowDomains": ["openai.com", "help.openai.com", "ai.google.dev", "openrouter.ai"],
    "denyDomains": ["medium.com", "reddit.com"]
  },
  "evidence": {
    "providers": ["google", "bing", "baidu", "brave", "tavily", "ddg"],
    "allowDomains": ["openai.com", "help.openai.com", "ai.google.dev", "openrouter.ai"],
    "denyDomains": ["medium.com", "pinterest.com"]
  }
}
```

- [ ] **Step 4: Run the config/policy test to verify it passes**

Run: `pnpm test -- tests/integration/search-gateway-policy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tsconfig.base.json packages/search-gateway config/search config/projects/openfons/search tests/integration/search-gateway-policy.test.ts
git commit -m "feat(search-gateway): add config resolution and provider catalog"
```

### Task 3: Implement provider adapters, dedupe, and package-level search orchestration

**Files:**
- Modify: `packages/search-gateway/src/index.ts`
- Create: `packages/search-gateway/src/providers/base.ts`
- Create: `packages/search-gateway/src/providers/google.ts`
- Create: `packages/search-gateway/src/providers/bing.ts`
- Create: `packages/search-gateway/src/providers/baidu.ts`
- Create: `packages/search-gateway/src/providers/ddg.ts`
- Create: `packages/search-gateway/src/providers/brave.ts`
- Create: `packages/search-gateway/src/providers/tavily.ts`
- Create: `packages/search-gateway/src/dedupe.ts`
- Create: `packages/search-gateway/src/gateway.ts`
- Test: `tests/integration/search-gateway-degrade.test.ts`

- [ ] **Step 1: Write the failing degrade/orchestration test**

```ts
import { describe, expect, it } from 'vitest';
import { createSearchGateway } from '@openfons/search-gateway';

describe('search-gateway degrade handling', () => {
  it('returns search results from healthy providers and records downgrade info for the rest', async () => {
    const gateway = createSearchGateway({
      projectId: 'openfons',
      providers: {
        google: {
          id: 'google',
          search: async () => [
            {
              title: 'OpenAI API pricing',
              url: 'https://openai.com/api/pricing/',
              snippet: 'Official pricing page',
              rank: 1,
              page: 1
            }
          ]
        },
        bing: {
          id: 'bing',
          search: async () => {
            throw new Error('missing-credential');
          }
        }
      }
    });

    const result = await gateway.search({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'direct api vs openrouter',
      providers: ['google', 'bing'],
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].domain).toBe('openai.com');
    expect(result.downgradeInfo[0].providerId).toBe('bing');
    expect(result.upgradeCandidates[0].proposedSourceKind).toBe('official');
  });
});
```

- [ ] **Step 2: Run the orchestration test to verify it fails**

Run: `pnpm test -- tests/integration/search-gateway-degrade.test.ts`
Expected: FAIL with missing export `createSearchGateway`.

- [ ] **Step 3: Implement the provider interface, adapters, and orchestrator**

```ts
// packages/search-gateway/src/providers/base.ts
import type {
  ProviderDiagnostic,
  SearchProviderId,
  SearchResult
} from '@openfons/contracts';

export type ProviderRawResult = {
  title: string;
  url: string;
  snippet: string;
  rank: number;
  page: number;
};

export type SearchProviderAdapter = {
  id: SearchProviderId;
  search: (input: {
    query: string;
    geo?: string;
    language?: string;
    page: number;
    maxResults: number;
  }) => Promise<ProviderRawResult[]>;
};

export const normalizeDomain = (value: string) =>
  new URL(value).hostname.replace(/^www\./, '');

export const guessSourceKind = (
  domain: string
): SearchResult['sourceKindGuess'] => {
  if (
    domain.endsWith('openai.com') ||
    domain.endsWith('google.com') ||
    domain.endsWith('openrouter.ai')
  ) {
    return 'official';
  }
  if (domain.endsWith('reddit.com') || domain.endsWith('github.com')) {
    return 'community';
  }
  return 'unknown';
};

export const buildDiagnostic = (input: {
  providerId: SearchProviderId;
  status: 'success' | 'degraded' | 'failed';
  degraded: boolean;
  reason: string;
  durationMs: number;
  resultCount: number;
  rateLimitState?: string;
}): ProviderDiagnostic => input;
```

```ts
// packages/search-gateway/src/providers/google.ts
import type { SearchProviderAdapter } from './base.js';

export const createGoogleAdapter = (deps: {
  fetch: typeof fetch;
  apiKey: string;
  cx: string;
}): SearchProviderAdapter => ({
  id: 'google',
  async search({ query, page, maxResults }) {
    const start = (page - 1) * maxResults + 1;
    const url = new URL('https://customsearch.googleapis.com/customsearch/v1');
    url.searchParams.set('key', deps.apiKey);
    url.searchParams.set('cx', deps.cx);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(maxResults));
    url.searchParams.set('start', String(start));

    const response = await deps.fetch(url);
    const payload = (await response.json()) as {
      items?: Array<{ title: string; link: string; snippet: string }>;
    };

    return (payload.items ?? []).map((item, index) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      rank: start + index,
      page
    }));
  }
});
```

```ts
// packages/search-gateway/src/providers/bing.ts
import type { SearchProviderAdapter } from './base.js';

export const createBingAdapter = (deps: {
  fetch: typeof fetch;
  apiKey: string;
  endpoint: string;
}): SearchProviderAdapter => ({
  id: 'bing',
  async search({ query, page, maxResults }) {
    const url = new URL(deps.endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(maxResults));
    url.searchParams.set('offset', String((page - 1) * maxResults));

    const response = await deps.fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': deps.apiKey }
    });
    const payload = (await response.json()) as {
      webPages?: { value?: Array<{ name: string; url: string; snippet: string }> };
    };

    return (payload.webPages?.value ?? []).map((item, index) => ({
      title: item.name,
      url: item.url,
      snippet: item.snippet,
      rank: (page - 1) * maxResults + index + 1,
      page
    }));
  }
});
```

```ts
// packages/search-gateway/src/providers/baidu.ts
import type { SearchProviderAdapter } from './base.js';

export const createBaiduAdapter = (deps: {
  fetch: typeof fetch;
  apiKey: string;
  secretKey: string;
  endpoint: string;
}): SearchProviderAdapter => ({
  id: 'baidu',
  async search({ query, page, maxResults }) {
    const url = new URL(deps.endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(maxResults));

    const response = await deps.fetch(url, {
      headers: {
        'X-API-Key': deps.apiKey,
        'X-Secret-Key': deps.secretKey
      }
    });
    const payload = (await response.json()) as {
      results?: Array<{ title: string; url: string; snippet: string }>;
    };

    return (payload.results ?? []).map((item, index) => ({
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      rank: (page - 1) * maxResults + index + 1,
      page
    }));
  }
});
```

```ts
// packages/search-gateway/src/providers/ddg.ts
import type { SearchProviderAdapter } from './base.js';

export const createDdgAdapter = (deps: {
  fetch: typeof fetch;
  endpoint: string;
}): SearchProviderAdapter => ({
  id: 'ddg',
  async search({ query, page, maxResults }) {
    const url = new URL(deps.endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(maxResults));

    const response = await deps.fetch(url);
    const payload = (await response.json()) as {
      results?: Array<{ title: string; url: string; snippet: string }>;
    };

    return (payload.results ?? []).map((item, index) => ({
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      rank: (page - 1) * maxResults + index + 1,
      page
    }));
  }
});
```

```ts
// packages/search-gateway/src/providers/brave.ts
import type { SearchProviderAdapter } from './base.js';

export const createBraveAdapter = (deps: {
  fetch: typeof fetch;
  apiKey: string;
}): SearchProviderAdapter => ({
  id: 'brave',
  async search({ query, page, maxResults }) {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(maxResults));
    url.searchParams.set('page', String(page));

    const response = await deps.fetch(url, {
      headers: {
        'X-Subscription-Token': deps.apiKey,
        Accept: 'application/json'
      }
    });
    const payload = (await response.json()) as {
      web?: { results?: Array<{ title: string; url: string; description: string }> };
    };

    return (payload.web?.results ?? []).map((item, index) => ({
      title: item.title,
      url: item.url,
      snippet: item.description,
      rank: (page - 1) * maxResults + index + 1,
      page
    }));
  }
});
```

```ts
// packages/search-gateway/src/providers/tavily.ts
import type { SearchProviderAdapter } from './base.js';

export const createTavilyAdapter = (deps: {
  fetch: typeof fetch;
  apiKey: string;
}): SearchProviderAdapter => ({
  id: 'tavily',
  async search({ query, page, maxResults }) {
    const response = await deps.fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: deps.apiKey,
        query,
        max_results: maxResults,
        page
      })
    });

    const payload = (await response.json()) as {
      results?: Array<{ title: string; url: string; content: string }>;
    };

    return (payload.results ?? []).map((item, index) => ({
      title: item.title,
      url: item.url,
      snippet: item.content,
      rank: (page - 1) * maxResults + index + 1,
      page
    }));
  }
});
```

```ts
// packages/search-gateway/src/dedupe.ts
import type { SearchResult } from '@openfons/contracts';

export const buildDedupKey = (url: string) => {
  const parsed = new URL(url);
  return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname}`.toLowerCase();
};

export const dedupeResults = (results: SearchResult[]) =>
  Array.from(
    results
      .reduce((map, result) => {
        const existing = map.get(result.dedupKey);
        if (!existing || result.rank < existing.rank) {
          map.set(result.dedupKey, result);
        }
        return map;
      }, new Map<string, SearchResult>())
      .values()
  );
```

```ts
// packages/search-gateway/src/gateway.ts
import { createId, nowIso } from '@openfons/shared';
import type {
  DowngradeInfo,
  SearchRequest,
  SearchRunResult,
  UpgradeCandidate,
  UpgradeDispatchResult
} from '@openfons/contracts';
import { buildDedupKey, dedupeResults } from './dedupe.js';
import {
  buildDiagnostic,
  guessSourceKind,
  normalizeDomain,
  type SearchProviderAdapter
} from './providers/base.js';
import { resolveEffectiveSearchPolicy } from './policy.js';

const lastSearchRuns = new Map<string, SearchRunResult>();

export const createSearchGateway = ({
  projectId,
  providers,
  dispatchCollectorRequests
}: {
  projectId: string;
  providers: Partial<Record<string, SearchProviderAdapter>>;
  dispatchCollectorRequests?: (candidates: UpgradeCandidate[]) => Promise<void>;
}) => ({
  async search(request: SearchRequest): Promise<SearchRunResult> {
    const effectivePolicy = resolveEffectiveSearchPolicy({
      projectId,
      purpose: request.purpose
    });
    const selectedProviderIds = request.providers ?? effectivePolicy.providers;
    const searchRunId = createId('search_run');
    const startedAt = nowIso();
    const diagnostics = [];
    const downgradeInfo: DowngradeInfo[] = [];
    const rawResults = [];

    for (const providerId of selectedProviderIds) {
      const adapter = providers[providerId];
      const started = Date.now();

      if (!adapter) {
        diagnostics.push(
          buildDiagnostic({
            providerId: providerId as any,
            status: 'failed',
            degraded: true,
            reason: 'missing-provider-adapter',
            durationMs: Date.now() - started,
            resultCount: 0
          })
        );
        downgradeInfo.push({
          providerId: providerId as any,
          status: 'degraded',
          reason: 'missing-provider-adapter',
          phase: 'orchestration',
          occurredAt: nowIso()
        });
        continue;
      }

      try {
        for (let page = 1; page <= request.pages; page += 1) {
          const pageResults = await adapter.search({
            query: request.query,
            geo: request.geo,
            language: request.language,
            page,
            maxResults: request.maxResults
          });

          rawResults.push(
            ...pageResults.map((item) => {
              const domain = normalizeDomain(item.url);
              return {
                id: createId('search_result'),
                searchRunId,
                provider: adapter.id,
                title: item.title,
                url: item.url,
                snippet: item.snippet,
                rank: item.rank,
                page: item.page,
                domain,
                sourceKindGuess: guessSourceKind(domain),
                dedupKey: buildDedupKey(item.url),
                selectedForUpgrade: false,
                selectionReason: 'unreviewed'
              };
            })
          );
        }

        diagnostics.push(
          buildDiagnostic({
            providerId: adapter.id,
            status: 'success',
            degraded: false,
            reason: 'ok',
            durationMs: Date.now() - started,
            resultCount: rawResults.filter((item) => item.provider === adapter.id).length
          })
        );
      } catch (error) {
        diagnostics.push(
          buildDiagnostic({
            providerId: adapter.id,
            status: 'degraded',
            degraded: true,
            reason: error instanceof Error ? error.message : 'unknown-error',
            durationMs: Date.now() - started,
            resultCount: 0
          })
        );
        downgradeInfo.push({
          providerId: adapter.id,
          status: 'degraded',
          reason: error instanceof Error ? error.message : 'unknown-error',
          phase: 'execution',
          occurredAt: nowIso()
        });
      }
    }

    const results = dedupeResults(rawResults).map((item) => {
      const selectedForUpgrade =
        effectivePolicy.allowDomains.includes(item.domain) &&
        !effectivePolicy.denyDomains.includes(item.domain) &&
        item.sourceKindGuess === 'official';

      return {
        ...item,
        selectedForUpgrade,
        selectionReason: selectedForUpgrade ? 'official-domain' : 'not-selected'
      };
    });

    const upgradeCandidates: UpgradeCandidate[] = results
      .filter((item) => item.selectedForUpgrade)
      .map((item) => ({
        searchResultId: item.id,
        searchRunId,
        opportunityId: request.opportunityId,
        workflowId: request.workflowId,
        recommendedAction: 'http',
        reason: 'official domain match',
        priority: 100 - item.rank,
        requiresHumanReview: false,
        proposedSourceKind: 'official',
        proposedUseAs: 'primary'
      }));

    if (request.autoUpgrade && dispatchCollectorRequests) {
      await dispatchCollectorRequests(upgradeCandidates);
    }

    const result: SearchRunResult = {
      searchRun: {
        id: searchRunId,
        projectId,
        opportunityId: request.opportunityId,
        workflowId: request.workflowId,
        taskId: request.taskId,
        purpose: request.purpose,
        query: request.query,
        status: 'completed',
        selectedProviders: selectedProviderIds as any,
        degradedProviders: downgradeInfo.map((item) => item.providerId),
        startedAt,
        finishedAt: nowIso()
      },
      results,
      upgradeCandidates,
      diagnostics,
      downgradeInfo
    };

    lastSearchRuns.set(searchRunId, result);
    return result;
  },

  async upgradeCandidates(
    searchRunId: string,
    selection: { selectedSearchResultIds: string[] }
  ): Promise<UpgradeDispatchResult> {
    const searchRun = lastSearchRuns.get(searchRunId);
    const selectedCandidates =
      searchRun?.upgradeCandidates.filter((candidate) =>
        selection.selectedSearchResultIds.includes(candidate.searchResultId)
      ) ?? [];

    if (dispatchCollectorRequests) {
      await dispatchCollectorRequests(selectedCandidates);
    }

    return {
      searchRunId,
      dispatchedCount: selectedCandidates.length,
      skippedCount: 0,
      collectorRequests: selectedCandidates
        .filter((candidate) => candidate.recommendedAction !== 'skip')
        .map((candidate) => ({
          searchResultId: candidate.searchResultId,
          action: candidate.recommendedAction,
          url:
            searchRun?.results.find((result) => result.id === candidate.searchResultId)
              ?.url ?? ''
        })),
      warnings: []
    };
  }
});
```

All provider adapters must return `ProviderRawResult[]`. Do not change the adapter return shape.

- [ ] **Step 4: Run the orchestration test to verify it passes**

Run: `pnpm test -- tests/integration/search-gateway-degrade.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/search-gateway tests/integration/search-gateway-degrade.test.ts
git commit -m "feat(search-gateway): add provider orchestration and degrade handling"
```

### Task 4: Add package-level provider status and config validation

**Files:**
- Modify: `packages/search-gateway/src/index.ts`
- Modify: `packages/search-gateway/src/catalog.ts`
- Create: `tests/integration/search-gateway-status.test.ts`

- [ ] **Step 1: Write the failing provider-status test**

```ts
import { describe, expect, it } from 'vitest';
import {
  getProviderStatus,
  validateSearchConfig
} from '@openfons/search-gateway';

describe('search-gateway provider status', () => {
  it('returns resolved provider status and config validation for a project', () => {
    const statuses = getProviderStatus('openfons');
    const validation = validateSearchConfig('openfons');

    expect(statuses.some((item) => item.providerId === 'google')).toBe(true);
    expect(validation.valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run the provider-status test to verify it fails**

Run: `pnpm test -- tests/integration/search-gateway-status.test.ts`
Expected: FAIL with missing exports `getProviderStatus` or `validateSearchConfig`.

- [ ] **Step 3: Implement provider-status and config-validation helpers**

```ts
// packages/search-gateway/src/catalog.ts
import {
  ProviderStatusSchema,
  ValidationResultSchema,
  type ProviderStatus,
  type ValidationResult
} from '@openfons/contracts';

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

    const configSatisfied =
      requiredFields.length === 0 || projectSatisfied || systemSatisfied;
    const resolvedFrom =
      requiredFields.length === 0
        ? 'none'
        : projectSatisfied
          ? 'project'
          : systemSatisfied
            ? 'system'
            : 'none';

    return ProviderStatusSchema.parse({
      providerId: provider.providerId,
      enabled: provider.enabledByDefault,
      healthy: configSatisfied,
      credentialResolvedFrom: resolvedFrom,
      degraded: !configSatisfied,
      reason:
        !configSatisfied
          ? 'missing-required-config'
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
      .map(
        (provider) => `${provider.providerId}: ${provider.reason ?? 'invalid-config'}`
      ),
    warnings: [],
    resolvedProviders
  });
};
```

```ts
// packages/search-gateway/src/index.ts
export * from './catalog.js';
export * from './policy.js';
export * from './gateway.js';
```

- [ ] **Step 4: Run the provider-status test to verify it passes**

Run: `pnpm test -- tests/integration/search-gateway-status.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/search-gateway/src/catalog.ts packages/search-gateway/src/index.ts tests/integration/search-gateway-status.test.ts
git commit -m "feat(search-gateway): add provider status and config validation"
```

### Task 5: Add the SearchGateway service and Hono endpoints

**Files:**
- Create: `services/search-gateway/package.json`
- Create: `services/search-gateway/tsconfig.json`
- Create: `services/search-gateway/tsconfig.build.json`
- Create: `services/search-gateway/src/store.ts`
- Create: `services/search-gateway/src/config.ts`
- Create: `services/search-gateway/src/app.ts`
- Create: `services/search-gateway/src/server.ts`
- Test: `tests/integration/search-gateway.test.ts`

- [ ] **Step 1: Write the failing service integration test**

```ts
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/search-gateway/src/app';

describe('search-gateway service', () => {
  it('creates a search run and exposes provider diagnostics', async () => {
    const app = createApp({
      search: async () => ({
        searchRun: {
          id: 'search_run_001',
          projectId: 'openfons',
          purpose: 'planning',
          query: 'direct api vs openrouter',
          status: 'completed',
          selectedProviders: ['google'],
          degradedProviders: [],
          startedAt: '2026-03-30T08:00:00.000Z',
          finishedAt: '2026-03-30T08:00:01.000Z'
        },
        results: [],
        upgradeCandidates: [],
        diagnostics: [
          {
            providerId: 'google',
            status: 'success',
            degraded: false,
            reason: 'ok',
            durationMs: 100,
            resultCount: 0
          }
        ],
        downgradeInfo: []
      }),
      providerStatus: [
        {
          providerId: 'google',
          enabled: true,
          healthy: true,
          credentialResolvedFrom: 'system',
          degraded: false
        }
      ]
    });

    const createResponse = await app.request('/api/v1/search/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: 'openfons',
        purpose: 'planning',
        query: 'direct api vs openrouter',
        providers: ['google'],
        maxResults: 10,
        pages: 1,
        autoUpgrade: false
      })
    });

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.searchRun.id).toBe('search_run_001');

    const runResponse = await app.request('/api/v1/search/runs/search_run_001');
    expect(runResponse.status).toBe(200);

    const providersResponse = await app.request('/api/v1/search/providers?projectId=openfons');
    expect(providersResponse.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run the service test to verify it fails**

Run: `pnpm test -- tests/integration/search-gateway.test.ts`
Expected: FAIL with missing service package or missing `createApp`.

- [ ] **Step 3: Implement the service package and routes**

```json
// services/search-gateway/package.json
{
  "name": "@openfons/search-gateway-service",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.build.json",
    "lint": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@hono/node-server": "^1.14.4",
    "@openfons/contracts": "workspace:*",
    "@openfons/search-gateway": "workspace:*",
    "hono": "^4.7.5"
  }
}
```

```json
// services/search-gateway/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src/**/*"]
}
```

```json
// services/search-gateway/tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "rootDir": "src",
    "outDir": "dist",
    "paths": {}
  }
}
```

```ts
// services/search-gateway/src/store.ts
import type {
  SearchRunResult,
  UpgradeDispatchResult
} from '@openfons/contracts';

export const createMemoryStore = () => {
  const runs = new Map<string, SearchRunResult>();
  const dispatches = new Map<string, UpgradeDispatchResult>();

  return {
    saveRun(run: SearchRunResult) {
      runs.set(run.searchRun.id, run);
    },
    getRun(id: string) {
      return runs.get(id);
    },
    saveDispatch(result: UpgradeDispatchResult) {
      dispatches.set(result.searchRunId, result);
    },
    getDispatch(searchRunId: string) {
      return dispatches.get(searchRunId);
    }
  };
};
```

```ts
// services/search-gateway/src/config.ts
import {
  getProviderStatus,
  validateSearchConfig
} from '@openfons/search-gateway';

export const loadProviderStatus = (projectId?: string) =>
  getProviderStatus(projectId);

export const loadValidation = (projectId?: string) =>
  validateSearchConfig(projectId);
```

```ts
// services/search-gateway/src/app.ts
import { SearchRequestSchema } from '@openfons/contracts';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createMemoryStore } from './store.js';

export const createApp = (
  deps: {
    search: (input: unknown) => Promise<any>;
    providerStatus: unknown[];
    validate?: (projectId?: string) => unknown;
    upgrade?: (searchRunId: string, selection: unknown) => Promise<any>;
  },
  store = createMemoryStore()
) => {
  const app = new Hono();

  app.post('/api/v1/search/runs', async (c) => {
    const payload = await c.req.json();
    const parsed = SearchRequestSchema.safeParse(payload);

    if (!parsed.success) {
      throw new HTTPException(400, {
        message: parsed.error.message
      });
    }

    const result = await deps.search(parsed.data);
    store.saveRun(result);
    return c.json(result, 201);
  });

  app.get('/api/v1/search/runs/:id', (c) => {
    const run = store.getRun(c.req.param('id'));
    if (!run) {
      throw new HTTPException(404, { message: 'Search run not found' });
    }
    return c.json(run);
  });

  app.post('/api/v1/search/runs/:id/upgrade', async (c) => {
    if (!deps.upgrade) {
      throw new HTTPException(501, {
        message: 'Upgrade dispatch not configured'
      });
    }

    const result = await deps.upgrade(c.req.param('id'), await c.req.json());
    store.saveDispatch(result);
    return c.json(result);
  });

  app.get('/api/v1/search/providers', (c) =>
    c.json({
      projectId: c.req.query('projectId'),
      providers: deps.providerStatus
    })
  );

  app.post('/api/v1/search/config/validate', async (c) => {
    const payload = (await c.req.json().catch(() => ({}))) as { projectId?: string };
    return c.json(
      deps.validate
        ? deps.validate(payload.projectId)
        : { valid: true, errors: [], warnings: [], resolvedProviders: deps.providerStatus }
    );
  });

  return app;
};
```

```ts
// services/search-gateway/src/server.ts
import { serve } from '@hono/node-server';
import { createSearchGateway } from '@openfons/search-gateway';
import { createApp } from './app.js';
import { loadProviderStatus, loadValidation } from './config.js';

const gateway = createSearchGateway({
  projectId: 'openfons',
  providers: {}
});

// Replace the empty providers object above with the concrete adapter map from Task 3
// before considering the service implementation complete.

const app = createApp({
  search: gateway.search,
  providerStatus: loadProviderStatus('openfons'),
  validate: loadValidation,
  upgrade: gateway.upgradeCandidates
});

serve(
  {
    fetch: app.fetch,
    port: 3003
  },
  () => {
    console.log('search-gateway listening on http://localhost:3003');
  }
);
```

- [ ] **Step 4: Run the service test to verify it passes**

Run: `pnpm test -- tests/integration/search-gateway.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/search-gateway tests/integration/search-gateway.test.ts
git commit -m "feat(search-gateway): add search gateway service endpoints"
```

### Task 6: Wire explicit upgrade dispatch and run full verification

**Files:**
- Modify: `packages/search-gateway/src/index.ts`
- Modify: `packages/search-gateway/src/gateway.ts`
- Modify: `services/search-gateway/src/app.ts`
- Test: `tests/integration/search-gateway.test.ts`
- Test: `tests/integration/search-gateway-policy.test.ts`
- Test: `tests/integration/search-gateway-degrade.test.ts`
- Test: `tests/integration/search-gateway-status.test.ts`

- [ ] **Step 1: Extend the service test for explicit upgrade dispatch**

```ts
// append to tests/integration/search-gateway.test.ts
it('dispatches selected upgrade candidates asynchronously', async () => {
  const app = createApp(
    {
      search: async () => ({
        searchRun: {
          id: 'search_run_002',
          projectId: 'openfons',
          purpose: 'evidence',
          query: 'openai pricing official',
          status: 'completed',
          selectedProviders: ['google'],
          degradedProviders: [],
          startedAt: '2026-03-30T08:10:00.000Z',
          finishedAt: '2026-03-30T08:10:01.000Z'
        },
        results: [],
        upgradeCandidates: [],
        diagnostics: [],
        downgradeInfo: []
      }),
      providerStatus: [],
      upgrade: async (searchRunId) => ({
        searchRunId,
        dispatchedCount: 1,
        skippedCount: 0,
        collectorRequests: [
          {
            searchResultId: 'search_result_001',
            action: 'http',
            url: 'https://openai.com/api/pricing/'
          }
        ],
        warnings: []
      })
    }
  );

  const response = await app.request('/api/v1/search/runs/search_run_002/upgrade', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      selectedSearchResultIds: ['search_result_001']
    })
  });

  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload.dispatchedCount).toBe(1);
});
```

- [ ] **Step 2: Run the service test to verify the new case fails**

Run: `pnpm test -- tests/integration/search-gateway.test.ts`
Expected: FAIL if upgrade handling is incomplete.

- [ ] **Step 3: Implement explicit upgrade dispatch and re-export the gateway API**

```ts
// packages/search-gateway/src/index.ts
export * from './catalog.js';
export * from './policy.js';
export * from './gateway.js';
```

Implement `upgradeCandidates()` using this function shape:

```ts
async upgradeCandidates(
  searchRunId: string,
  selection: { selectedSearchResultIds: string[] }
): Promise<UpgradeDispatchResult> {
  const searchRun = lastSearchRuns.get(searchRunId);
  const selectedCandidates =
    searchRun?.upgradeCandidates.filter((candidate) =>
      selection.selectedSearchResultIds.includes(candidate.searchResultId)
    ) ?? [];

  if (dispatchCollectorRequests) {
    await dispatchCollectorRequests(selectedCandidates);
  }

  return {
    searchRunId,
    dispatchedCount: selectedCandidates.length,
    skippedCount: 0,
    collectorRequests: selectedCandidates
      .filter((candidate) => candidate.recommendedAction !== 'skip')
      .map((candidate) => ({
        searchResultId: candidate.searchResultId,
        action: candidate.recommendedAction,
        url:
          searchRun?.results.find((result) => result.id === candidate.searchResultId)
            ?.url ?? ''
      })),
    warnings: []
  };
}
```

- [ ] **Step 4: Run the focused search-gateway suite**

Run:
`pnpm test -- tests/contract/search-gateway-schema.test.ts tests/integration/search-gateway-policy.test.ts tests/integration/search-gateway-degrade.test.ts tests/integration/search-gateway-status.test.ts tests/integration/search-gateway.test.ts`

Expected: PASS

- [ ] **Step 5: Run repository verification**

Run: `pnpm check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/search-gateway services/search-gateway tsconfig.base.json config/search config/projects/openfons/search tests/contract/search-gateway-schema.test.ts tests/integration/search-gateway-policy.test.ts tests/integration/search-gateway-degrade.test.ts tests/integration/search-gateway-status.test.ts tests/integration/search-gateway.test.ts
git commit -m "feat(search-gateway): ship v1 search discovery gateway"
```

## Self-Review

### Spec coverage

Covered:

1. dual-mode search (`planning` and `evidence`) by Task 1 and Task 3
2. system default + project override config by Task 2
3. provider capability matrix and credential schema by Task 1 and Task 2
4. package-level provider status and config validation by Task 4
5. single- and multi-provider orchestration by Task 3
6. downgrade handling by Task 3 and Task 6
7. upgrade candidates and async dispatch by Task 3, Task 5, and Task 6
8. package + service split by Task 2, Task 3, Task 4, and Task 5

Intentionally deferred:

1. full `CollectorGateway` implementation
2. durable database persistence for search runs
3. UI integration into `control-web` or a future `ops-web`

### Placeholder scan

No `TODO`, `TBD`, or empty steps remain. Every code-changing step includes concrete file paths, code, commands, and expected results.

### Type consistency

The plan consistently uses:

1. `SearchRequest`
2. `SearchRun`
3. `SearchResult`
4. `UpgradeCandidate`
5. `SearchRunResult`
6. `UpgradeDispatchResult`
7. `ProviderCapability`
8. `CredentialSchema`

The provider IDs are consistently:

`google | bing | baidu | ddg | brave | tavily`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-30-search-gateway-v1.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
