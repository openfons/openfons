# OpenFons Repo Skeleton v1 + Control Plane Minimum Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable OpenFons monorepo slice: workspace scaffold, shared contracts/models, one Hono API, and two React + TanStack Router apps that prove the `Opportunity -> compile -> report` path.

**Architecture:** Start with a pnpm TypeScript monorepo whose first-class shared layer is `packages/contracts`, `packages/domain-models`, and `packages/shared`. Keep runtime intentionally thin: `services/control-api` owns the in-memory orchestration edge, `apps/control-web` creates and compiles opportunities, and `apps/report-web` renders report shells from the API. Defer workers, persistent storage, ops-web, and infra-heavy deployment to later plans.

**Tech Stack:** pnpm workspace, TypeScript, Vitest, Zod, Hono, React, Vite, TanStack Router, PowerShell, Docker Compose

---

### Task 1: Bootstrap the pnpm workspace and root toolchain

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `.npmrc`
- Modify: `.gitignore`

- [ ] **Step 1: Create the first-batch directory scaffold**

Run:

```powershell
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\apps\control-web\src\pages"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\apps\report-web\src\pages"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\services\control-api\src"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\packages\contracts\src"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\packages\domain-models\src"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\packages\shared\src"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\config\sources"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\config\policies"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\config\templates"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\tests\contract"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\tests\integration"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\tests\smoke"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\scripts\dev"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\scripts\check"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\infra\docker"
New-Item -ItemType Directory -Force -Path "d:\demo1\openfons\infra\local-dev"
```

Expected: all `v1` directories from the approved design exist, but no extra `worker-*`, `ops-web`, or `k8s` skeletons are created.

- [ ] **Step 2: Write the root workspace files**

```json
// package.json
{
  "name": "openfons",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@10.7.1",
  "scripts": {
    "dev": "pnpm -r --parallel --filter @openfons/control-api --filter @openfons/control-web --filter @openfons/report-web dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@types/node": "^22.13.11",
    "jsdom": "^26.0.0",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2",
    "vite": "^6.2.2",
    "vite-tsconfig-paths": "^5.1.4",
    "vitest": "^3.0.9"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - services/*
  - packages/*
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@openfons/shared": ["packages/shared/src/index.ts"],
      "@openfons/domain-models": ["packages/domain-models/src/index.ts"],
      "@openfons/contracts": ["packages/contracts/src/index.ts"]
    }
  }
}
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environmentMatchGlobs: [
      ['tests/smoke/**/*.test.tsx', 'jsdom'],
      ['tests/**/*.test.ts', 'node']
    ]
  }
});
```

```ts
// tests/setup.ts
import '@testing-library/jest-dom/vitest';
```

```text
# .npmrc
auto-install-peers=true
shared-workspace-lockfile=true
strict-peer-dependencies=false
```

```gitignore
# .gitignore
AGENTS.md
Memory/**
memory/**
node_modules/
dist/
coverage/
.vite/
*.tsbuildinfo
.env
.env.*
!.env.example
__pycache__/
*.pyc
.DS_Store
data/temp/
```

- [ ] **Step 3: Install the root toolchain and create the lockfile**

Run:

```powershell
pnpm install
```

Expected: `pnpm-lock.yaml` is created and the root toolchain installs without workspace errors.

- [ ] **Step 4: Commit the workspace bootstrap**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.config.ts tests/setup.ts .npmrc .gitignore pnpm-lock.yaml
git commit -m "chore(repo): bootstrap pnpm workspace"
```

### Task 2: Add `packages/shared` utility primitives

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/id.ts`
- Create: `packages/shared/src/text.ts`
- Create: `packages/shared/src/time.ts`
- Create: `packages/shared/src/index.ts`
- Test: `tests/contract/shared-utils.test.ts`

- [ ] **Step 1: Write the failing shared-utility test**

```ts
// tests/contract/shared-utils.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createId, nowIso, slugify } from '@openfons/shared';

describe('@openfons/shared', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('slugify normalizes human-readable titles', () => {
    expect(slugify('AI Coding Model Procurement Options')).toBe(
      'ai-coding-model-procurement-options'
    );
  });

  it('createId prefixes generated ids', () => {
    expect(createId('opp')).toMatch(/^opp_[a-z0-9]{8}$/);
  });

  it('nowIso returns an ISO timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T12:00:00.000Z'));

    expect(nowIso()).toBe('2026-03-27T12:00:00.000Z');
  });
});
```

- [ ] **Step 2: Run the shared-utility test and verify it fails**

Run:

```powershell
pnpm test -- tests/contract/shared-utils.test.ts
```

Expected: FAIL because `@openfons/shared` does not exist yet.

- [ ] **Step 3: Implement the shared package**

```json
// packages/shared/package.json
{
  "name": "@openfons/shared",
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
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

```json
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

```ts
// packages/shared/src/id.ts
export const createId = (prefix: string): string => {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${suffix}`;
};
```

```ts
// packages/shared/src/text.ts
export const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
```

```ts
// packages/shared/src/time.ts
export const nowIso = (): string => new Date().toISOString();
```

```ts
// packages/shared/src/index.ts
export * from './id.js';
export * from './text.js';
export * from './time.js';
```

- [ ] **Step 4: Run the shared-utility test again and verify it passes**

Run:

```powershell
pnpm test -- tests/contract/shared-utils.test.ts
pnpm --filter @openfons/shared lint
```

Expected: PASS for the contract test, then a clean TypeScript no-emit check for `@openfons/shared`.

- [ ] **Step 5: Commit the shared package**

```bash
git add packages/shared tests/contract/shared-utils.test.ts
git commit -m "feat(shared): add workspace utility primitives"
```

### Task 3: Add `packages/domain-models` for topic, evidence, and artifact shapes

**Files:**
- Create: `packages/domain-models/package.json`
- Create: `packages/domain-models/tsconfig.json`
- Create: `packages/domain-models/src/index.ts`
- Test: `tests/contract/domain-models.test.ts`

- [ ] **Step 1: Write the failing domain-model test**

```ts
// tests/contract/domain-models.test.ts
import { describe, expect, it } from 'vitest';
import { addEvidence, createEvidenceSet } from '@openfons/domain-models';

describe('@openfons/domain-models', () => {
  it('creates an empty evidence set for a topic', () => {
    const evidenceSet = createEvidenceSet('topic_ai_agents');

    expect(evidenceSet.topicId).toBe('topic_ai_agents');
    expect(evidenceSet.items).toEqual([]);
  });

  it('adds evidence immutably', () => {
    const initial = createEvidenceSet('topic_ai_agents');
    const next = addEvidence(initial, {
      id: 'evi_001',
      source: 'search',
      title: 'Best AI coding models',
      url: 'https://example.com/models',
      collectedAt: '2026-03-27T12:00:00.000Z',
      summary: 'Comparison snapshot'
    });

    expect(initial.items).toHaveLength(0);
    expect(next.items).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the domain-model test and verify it fails**

Run:

```powershell
pnpm test -- tests/contract/domain-models.test.ts
```

Expected: FAIL because `@openfons/domain-models` does not exist yet.

- [ ] **Step 3: Implement the domain-model package**

```json
// packages/domain-models/package.json
{
  "name": "@openfons/domain-models",
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
    "@openfons/shared": "workspace:*"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

```json
// packages/domain-models/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

```ts
// packages/domain-models/src/index.ts
import { createId, nowIso } from '@openfons/shared';

export type TopicStatus = 'draft' | 'ready';
export type ArtifactType = 'opportunity' | 'report';

export type Topic = {
  id: string;
  query: string;
  market: string;
  audience: string;
  status: TopicStatus;
};

export type Evidence = {
  id: string;
  source: string;
  title: string;
  url: string;
  collectedAt: string;
  summary: string;
};

export type EvidenceSet = {
  id: string;
  topicId: string;
  createdAt: string;
  items: Evidence[];
};

export type Artifact = {
  id: string;
  topicId: string;
  type: ArtifactType;
  storage: 'memory' | 'file';
  uri: string;
  createdAt: string;
};

export const createEvidenceSet = (topicId: string): EvidenceSet => ({
  id: createId('es'),
  topicId,
  createdAt: nowIso(),
  items: []
});

export const addEvidence = (
  evidenceSet: EvidenceSet,
  evidence: Evidence
): EvidenceSet => ({
  ...evidenceSet,
  items: [...evidenceSet.items, evidence]
});
```

- [ ] **Step 4: Run the domain-model test again and verify it passes**

Run:

```powershell
pnpm install
pnpm test -- tests/contract/domain-models.test.ts
pnpm --filter @openfons/domain-models lint
```

Expected: the workspace links `@openfons/shared`, the domain-model test passes, and the package typecheck is clean.

- [ ] **Step 5: Commit the domain-model package**

```bash
git add packages/domain-models tests/contract/domain-models.test.ts pnpm-lock.yaml
git commit -m "feat(domain): add topic and evidence models"
```

### Task 4: Add `packages/contracts` as the shared source-of-truth schemas

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/index.ts`
- Test: `tests/contract/contracts-schema.test.ts`

- [ ] **Step 1: Write the failing contracts test**

```ts
// tests/contract/contracts-schema.test.ts
import { describe, expect, it } from 'vitest';
import {
  CompilationResultSchema,
  OpportunityInputSchema,
  ReportSpecSchema
} from '@openfons/contracts';

describe('@openfons/contracts', () => {
  it('parses a valid opportunity input', () => {
    const parsed = OpportunityInputSchema.parse({
      title: 'AI Coding Model Procurement Options',
      query: 'best ai coding models',
      market: 'global',
      audience: 'engineering leads',
      problem: 'Teams need to compare price and routing options',
      outcome: 'Produce a minimal report shell'
    });

    expect(parsed.query).toBe('best ai coding models');
  });

  it('rejects an opportunity without a title', () => {
    const result = OpportunityInputSchema.safeParse({
      title: '',
      query: 'best ai coding models',
      market: 'global',
      audience: 'engineering leads',
      problem: 'Teams need to compare price and routing options',
      outcome: 'Produce a minimal report shell'
    });

    expect(result.success).toBe(false);
  });

  it('parses a compilation result', () => {
    const parsed = CompilationResultSchema.parse({
      opportunity: {
        id: 'opp_001',
        slug: 'ai-coding-model-procurement-options',
        title: 'AI Coding Model Procurement Options',
        market: 'global',
        input: {
          title: 'AI Coding Model Procurement Options',
          query: 'best ai coding models',
          market: 'global',
          audience: 'engineering leads',
          problem: 'Teams need to compare price and routing options',
          outcome: 'Produce a minimal report shell'
        },
        status: 'compiled',
        createdAt: '2026-03-27T12:00:00.000Z'
      },
      tasks: [
        {
          id: 'task_001',
          opportunityId: 'opp_001',
          kind: 'collect-evidence',
          status: 'ready'
        }
      ],
      workflow: {
        id: 'wf_001',
        opportunityId: 'opp_001',
        taskIds: ['task_001'],
        status: 'ready'
      },
      report: {
        id: 'report_001',
        opportunityId: 'opp_001',
        title: 'AI Coding Model Procurement Options',
        summary: 'Short summary',
        sections: [
          {
            id: 'sec_001',
            title: 'Why this topic',
            body: 'Demand is rising.'
          }
        ],
        createdAt: '2026-03-27T12:00:00.000Z'
      }
    });

    expect(parsed.report).toMatchObject(
      ReportSpecSchema.parse({
        id: 'report_001',
        opportunityId: 'opp_001',
        title: 'AI Coding Model Procurement Options',
        summary: 'Short summary',
        sections: [
          {
            id: 'sec_001',
            title: 'Why this topic',
            body: 'Demand is rising.'
          }
        ],
        createdAt: '2026-03-27T12:00:00.000Z'
      })
    );
  });
});
```

- [ ] **Step 2: Run the contracts test and verify it fails**

Run:

```powershell
pnpm test -- tests/contract/contracts-schema.test.ts
```

Expected: FAIL because `@openfons/contracts` does not exist yet.

- [ ] **Step 3: Implement the contracts package**

```json
// packages/contracts/package.json
{
  "name": "@openfons/contracts",
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
    "zod": "^3.24.2"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

```json
// packages/contracts/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

```ts
// packages/contracts/src/index.ts
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
```

- [ ] **Step 4: Install `zod` and verify the contracts package**

Run:

```powershell
pnpm install
pnpm test -- tests/contract/contracts-schema.test.ts
pnpm --filter @openfons/contracts lint
```

Expected: the new dependency installs, the contract test passes, and the package typecheck is clean.

- [ ] **Step 5: Commit the contracts package**

```bash
git add packages/contracts tests/contract/contracts-schema.test.ts pnpm-lock.yaml
git commit -m "feat(contracts): add core opportunity and report schemas"
```

### Task 5: Build `services/control-api` as the compile edge

**Files:**
- Create: `services/control-api/package.json`
- Create: `services/control-api/tsconfig.json`
- Create: `services/control-api/src/compiler.ts`
- Create: `services/control-api/src/store.ts`
- Create: `services/control-api/src/app.ts`
- Create: `services/control-api/src/server.ts`
- Test: `tests/integration/control-api.test.ts`

- [ ] **Step 1: Write the failing integration test for the compile flow**

```ts
// tests/integration/control-api.test.ts
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app';

describe('control-api', () => {
  it('creates, compiles, and returns a report shell', async () => {
    const app = createApp();

    const createResponse = await app.request('/api/v1/opportunities', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        title: 'AI Coding Model Procurement Options',
        query: 'best ai coding models',
        market: 'global',
        audience: 'engineering leads',
        problem: 'Teams need to compare price and routing options',
        outcome: 'Produce a minimal report shell'
      })
    });

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.opportunity.status).toBe('draft');

    const compileResponse = await app.request(
      `/api/v1/opportunities/${created.opportunity.id}/compile`,
      {
        method: 'POST'
      }
    );

    expect(compileResponse.status).toBe(200);
    const compiled = await compileResponse.json();
    expect(compiled.opportunity.status).toBe('compiled');
    expect(compiled.workflow.taskIds).toHaveLength(3);
    expect(compiled.report.id).toMatch(/^report_[a-z0-9]{8}$/);

    const reportResponse = await app.request(
      `/api/v1/reports/${compiled.report.id}`
    );

    expect(reportResponse.status).toBe(200);
    const report = await reportResponse.json();
    expect(report.title).toContain('AI Coding Model');
  });
});
```

- [ ] **Step 2: Run the integration test and verify it fails**

Run:

```powershell
pnpm test -- tests/integration/control-api.test.ts
```

Expected: FAIL because `services/control-api/src/app.ts` does not exist yet.

- [ ] **Step 3: Create the service package shell**

```json
// services/control-api/package.json
{
  "name": "@openfons/control-api",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "lint": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@hono/node-server": "^1.14.4",
    "@openfons/contracts": "workspace:*",
    "@openfons/shared": "workspace:*",
    "hono": "^4.7.5"
  }
}
```

```json
// services/control-api/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 4: Implement the in-memory compiler helpers**

```ts
// services/control-api/src/compiler.ts
import type {
  CompilationResult,
  OpportunityInput,
  OpportunitySpec,
  ReportSpec,
  TaskSpec,
  WorkflowSpec
} from '@openfons/contracts';
import { createId, nowIso, slugify } from '@openfons/shared';

export const buildOpportunity = (input: OpportunityInput): OpportunitySpec => ({
  id: createId('opp'),
  slug: slugify(input.title),
  title: input.title,
  market: input.market,
  input,
  status: 'draft',
  createdAt: nowIso()
});

export const buildCompilation = (
  opportunity: OpportunitySpec
): CompilationResult => {
  const tasks: TaskSpec[] = [
    {
      id: createId('task'),
      opportunityId: opportunity.id,
      kind: 'collect-evidence',
      status: 'ready'
    },
    {
      id: createId('task'),
      opportunityId: opportunity.id,
      kind: 'score-opportunity',
      status: 'ready'
    },
    {
      id: createId('task'),
      opportunityId: opportunity.id,
      kind: 'render-report',
      status: 'ready'
    }
  ];

  const workflow: WorkflowSpec = {
    id: createId('wf'),
    opportunityId: opportunity.id,
    taskIds: tasks.map((task) => task.id),
    status: 'ready'
  };

  const report: ReportSpec = {
    id: createId('report'),
    opportunityId: opportunity.id,
    title: opportunity.title,
    summary: `Minimal report shell for ${opportunity.title}`,
    sections: [
      {
        id: createId('sec'),
        title: 'Why this topic now',
        body: `${opportunity.input.problem} -> ${opportunity.input.outcome}`
      },
      {
        id: createId('sec'),
        title: 'Target audience',
        body: `${opportunity.input.audience} in ${opportunity.market}`
      },
      {
        id: createId('sec'),
        title: 'Next execution slice',
        body: 'Replace in-memory shell generation with real evidence ingestion in the next plan.'
      }
    ],
    createdAt: nowIso()
  };

  return {
    opportunity: {
      ...opportunity,
      status: 'compiled'
    },
    tasks,
    workflow,
    report
  };
};
```

```ts
// services/control-api/src/store.ts
import type { CompilationResult, OpportunitySpec, ReportSpec } from '@openfons/contracts';

export type MemoryStore = {
  getOpportunity: (id: string) => OpportunitySpec | undefined;
  saveOpportunity: (opportunity: OpportunitySpec) => void;
  saveCompilation: (result: CompilationResult) => void;
  getReport: (id: string) => ReportSpec | undefined;
};

export const createMemoryStore = (): MemoryStore => {
  const opportunities = new Map<string, OpportunitySpec>();
  const reports = new Map<string, ReportSpec>();

  return {
    getOpportunity: (id) => opportunities.get(id),
    saveOpportunity: (opportunity) => {
      opportunities.set(opportunity.id, opportunity);
    },
    saveCompilation: (result) => {
      opportunities.set(result.opportunity.id, result.opportunity);
      reports.set(result.report.id, result.report);
    },
    getReport: (id) => reports.get(id)
  };
};
```

- [ ] **Step 5: Implement the Hono app and server entry**

```ts
// services/control-api/src/app.ts
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { OpportunityInputSchema } from '@openfons/contracts';
import { buildCompilation, buildOpportunity } from './compiler.js';
import { createMemoryStore, type MemoryStore } from './store.js';

export const createApp = (store: MemoryStore = createMemoryStore()) => {
  const app = new Hono();

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.post('/api/v1/opportunities', async (c) => {
    const payload = await c.req.json();
    const parsed = OpportunityInputSchema.safeParse(payload);

    if (!parsed.success) {
      throw new HTTPException(400, {
        message: parsed.error.message
      });
    }

    const opportunity = buildOpportunity(parsed.data);
    store.saveOpportunity(opportunity);

    return c.json({ opportunity }, 201);
  });

  app.post('/api/v1/opportunities/:opportunityId/compile', (c) => {
    const opportunityId = c.req.param('opportunityId');
    const opportunity = store.getOpportunity(opportunityId);

    if (!opportunity) {
      throw new HTTPException(404, {
        message: 'Opportunity not found'
      });
    }

    const compiled = buildCompilation(opportunity);
    store.saveCompilation(compiled);

    return c.json(compiled);
  });

  app.get('/api/v1/reports/:reportId', (c) => {
    const report = store.getReport(c.req.param('reportId'));

    if (!report) {
      throw new HTTPException(404, {
        message: 'Report not found'
      });
    }

    return c.json(report);
  });

  return app;
};
```

```ts
// services/control-api/src/server.ts
import { serve } from '@hono/node-server';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3001);

serve({
  fetch: createApp().fetch,
  port
});

console.log(`control-api listening on http://localhost:${port}`);
```

- [ ] **Step 6: Install service dependencies and verify the compile flow**

Run:

```powershell
pnpm install
pnpm test -- tests/integration/control-api.test.ts
pnpm --filter @openfons/control-api lint
```

Expected: dependencies install, the integration test passes end to end, and the service typecheck is clean.

- [ ] **Step 7: Commit the control API slice**

```bash
git add services/control-api tests/integration/control-api.test.ts pnpm-lock.yaml
git commit -m "feat(control-api): add minimal compile flow"
```

### Task 6: Build `apps/control-web` for opportunity intake and compile trigger

**Files:**
- Create: `apps/control-web/package.json`
- Create: `apps/control-web/tsconfig.json`
- Create: `apps/control-web/vite.config.ts`
- Create: `apps/control-web/index.html`
- Create: `apps/control-web/src/api.ts`
- Create: `apps/control-web/src/pages/opportunity-page.tsx`
- Create: `apps/control-web/src/router.tsx`
- Create: `apps/control-web/src/main.tsx`
- Create: `apps/control-web/src/styles.css`
- Test: `tests/smoke/control-web.test.tsx`

- [ ] **Step 1: Write the failing smoke test for the control form**

```tsx
// tests/smoke/control-web.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OpportunityPage } from '../../apps/control-web/src/pages/opportunity-page';

describe('control-web', () => {
  it('submits an opportunity and shows the generated report link', async () => {
    const api = {
      createOpportunity: async () => ({
        id: 'opp_001',
        slug: 'ai-coding-model-procurement-options',
        title: 'AI Coding Model Procurement Options',
        market: 'global',
        input: {
          title: 'AI Coding Model Procurement Options',
          query: 'best ai coding models',
          market: 'global',
          audience: 'engineering leads',
          problem: 'Teams need to compare price and routing options',
          outcome: 'Produce a minimal report shell'
        },
        status: 'draft' as const,
        createdAt: '2026-03-27T12:00:00.000Z'
      }),
      compileOpportunity: async () => ({
        opportunity: {
          id: 'opp_001',
          slug: 'ai-coding-model-procurement-options',
          title: 'AI Coding Model Procurement Options',
          market: 'global',
          input: {
            title: 'AI Coding Model Procurement Options',
            query: 'best ai coding models',
            market: 'global',
            audience: 'engineering leads',
            problem: 'Teams need to compare price and routing options',
            outcome: 'Produce a minimal report shell'
          },
          status: 'compiled' as const,
          createdAt: '2026-03-27T12:00:00.000Z'
        },
        tasks: [
          {
            id: 'task_001',
            opportunityId: 'opp_001',
            kind: 'collect-evidence' as const,
            status: 'ready' as const
          },
          {
            id: 'task_002',
            opportunityId: 'opp_001',
            kind: 'score-opportunity' as const,
            status: 'ready' as const
          },
          {
            id: 'task_003',
            opportunityId: 'opp_001',
            kind: 'render-report' as const,
            status: 'ready' as const
          }
        ],
        workflow: {
          id: 'wf_001',
          opportunityId: 'opp_001',
          taskIds: ['task_001', 'task_002', 'task_003'],
          status: 'ready' as const
        },
        report: {
          id: 'report_001',
          opportunityId: 'opp_001',
          title: 'AI Coding Model Procurement Options',
          summary: 'Minimal report shell',
          sections: [
            {
              id: 'sec_001',
              title: 'Why this topic now',
              body: 'Demand is rising.'
            }
          ],
          createdAt: '2026-03-27T12:00:00.000Z'
        }
      })
    };

    render(
      <OpportunityPage
        api={api}
        reportBaseUrl="http://localhost:3002"
      />
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'AI Coding Model Procurement Options' }
    });
    fireEvent.change(screen.getByLabelText(/query/i), {
      target: { value: 'best ai coding models' }
    });
    fireEvent.change(screen.getByLabelText(/market/i), {
      target: { value: 'global' }
    });
    fireEvent.change(screen.getByLabelText(/audience/i), {
      target: { value: 'engineering leads' }
    });
    fireEvent.change(screen.getByLabelText(/problem/i), {
      target: { value: 'Teams need to compare price and routing options' }
    });
    fireEvent.change(screen.getByLabelText(/outcome/i), {
      target: { value: 'Produce a minimal report shell' }
    });
    fireEvent.click(screen.getByRole('button', { name: /compile report shell/i }));

    expect(
      await screen.findByRole('link', { name: /open report shell/i })
    ).toHaveAttribute('href', 'http://localhost:3002/reports/report_001');
  });
});
```

- [ ] **Step 2: Run the smoke test and verify it fails**

Run:

```powershell
pnpm test -- tests/smoke/control-web.test.tsx
```

Expected: FAIL because `OpportunityPage` and the control app do not exist yet.

- [ ] **Step 3: Create the Vite app shell and API client**

```json
// apps/control-web/package.json
{
  "name": "@openfons/control-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3000",
    "build": "vite build",
    "lint": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "preview": "vite preview"
  },
  "dependencies": {
    "@openfons/contracts": "workspace:*",
    "@tanstack/react-router": "^1.114.25",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@vitejs/plugin-react": "^4.4.1",
    "vite": "^6.2.2",
    "vite-tsconfig-paths": "^5.1.4"
  }
}
```

```json
// apps/control-web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true
  },
  "include": ["src/**/*", "vite.config.ts"]
}
```

```ts
// apps/control-web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()]
});
```

```html
<!-- apps/control-web/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OpenFons Control</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```ts
// apps/control-web/src/api.ts
import type {
  CompilationResult,
  OpportunityInput,
  OpportunitySpec
} from '@openfons/contracts';

export type ControlApi = {
  createOpportunity: (input: OpportunityInput) => Promise<OpportunitySpec>;
  compileOpportunity: (opportunityId: string) => Promise<CompilationResult>;
};

export const createControlApi = (baseUrl: string): ControlApi => ({
  async createOpportunity(input) {
    const response = await fetch(`${baseUrl}/api/v1/opportunities`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error('Failed to create opportunity');
    }

    const payload = (await response.json()) as { opportunity: OpportunitySpec };
    return payload.opportunity;
  },
  async compileOpportunity(opportunityId) {
    const response = await fetch(
      `${baseUrl}/api/v1/opportunities/${opportunityId}/compile`,
      {
        method: 'POST'
      }
    );

    if (!response.ok) {
      throw new Error('Failed to compile opportunity');
    }

    return (await response.json()) as CompilationResult;
  }
});
```

- [ ] **Step 4: Implement the opportunity page UI**

```tsx
// apps/control-web/src/pages/opportunity-page.tsx
import { useState, type FormEvent } from 'react';
import type { CompilationResult, OpportunityInput } from '@openfons/contracts';
import { createControlApi, type ControlApi } from '../api';

type Props = {
  api?: ControlApi;
  reportBaseUrl?: string;
};

const initialForm: OpportunityInput = {
  title: '',
  query: '',
  market: '',
  audience: '',
  problem: '',
  outcome: ''
};

export const OpportunityPage = ({
  api = createControlApi(import.meta.env.VITE_CONTROL_API_BASE_URL ?? 'http://localhost:3001'),
  reportBaseUrl = import.meta.env.VITE_REPORT_WEB_BASE_URL ?? 'http://localhost:3002'
}: Props) => {
  const [form, setForm] = useState<OpportunityInput>(initialForm);
  const [result, setResult] = useState<CompilationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (key: keyof OpportunityInput, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const opportunity = await api.createOpportunity(form);
      const compiled = await api.compileOpportunity(opportunity.id);
      setResult(compiled);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">OpenFons Control Plane</p>
        <h1>Compile the first report shell</h1>
        <p className="lede">
          Submit one opportunity and prove the minimum control-plane slice.
        </p>
        <form className="stack" onSubmit={submit}>
          <label>
            Title
            <input value={form.title} onChange={(event) => updateField('title', event.target.value)} />
          </label>
          <label>
            Query
            <input value={form.query} onChange={(event) => updateField('query', event.target.value)} />
          </label>
          <label>
            Market
            <input value={form.market} onChange={(event) => updateField('market', event.target.value)} />
          </label>
          <label>
            Audience
            <input value={form.audience} onChange={(event) => updateField('audience', event.target.value)} />
          </label>
          <label>
            Problem
            <textarea value={form.problem} onChange={(event) => updateField('problem', event.target.value)} />
          </label>
          <label>
            Outcome
            <textarea value={form.outcome} onChange={(event) => updateField('outcome', event.target.value)} />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Compiling...' : 'Compile report shell'}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>

      {result ? (
        <section className="panel result-card">
          <h2>Compilation ready</h2>
          <p>{result.report.summary}</p>
          <p>Workflow tasks: {result.workflow.taskIds.length}</p>
          <a href={`${reportBaseUrl}/reports/${result.report.id}`}>Open report shell</a>
        </section>
      ) : null}
    </main>
  );
};
```

- [ ] **Step 5: Add the router, entry point, and styles**

```tsx
// apps/control-web/src/router.tsx
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { OpportunityPage } from './pages/opportunity-page';

const RootLayout = () => (
  <>
    <Outlet />
  </>
);

const rootRoute = createRootRoute({
  component: RootLayout
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: OpportunityPage
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({
  routeTree
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

```tsx
// apps/control-web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
```

```css
/* apps/control-web/src/styles.css */
:root {
  font-family: "Segoe UI", sans-serif;
  color: #102033;
  background: linear-gradient(180deg, #f4f7fb 0%, #eef2f6 100%);
}

body {
  margin: 0;
}

.page-shell {
  min-height: 100vh;
  padding: 32px;
  display: grid;
  gap: 24px;
}

.panel {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 18px 50px rgba(16, 32, 51, 0.08);
}

.stack {
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  font-weight: 600;
}

input,
textarea,
button {
  font: inherit;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #cdd7e3;
}

button {
  border: none;
  background: #17395d;
  color: white;
  cursor: pointer;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #4f6b88;
}

.lede,
.error {
  color: #4c5d70;
}
```

- [ ] **Step 6: Install dependencies and verify the control app**

Run:

```powershell
pnpm install
pnpm test -- tests/smoke/control-web.test.tsx
pnpm --filter @openfons/control-web build
pnpm --filter @openfons/control-web lint
```

Expected: React dependencies install, the smoke test passes, the Vite build succeeds, and TypeScript reports no errors.

- [ ] **Step 7: Commit the control-web shell**

```bash
git add apps/control-web tests/smoke/control-web.test.tsx pnpm-lock.yaml
git commit -m "feat(control-web): add opportunity compile shell"
```

### Task 7: Build `apps/report-web` for report-shell rendering

**Files:**
- Create: `apps/report-web/package.json`
- Create: `apps/report-web/tsconfig.json`
- Create: `apps/report-web/vite.config.ts`
- Create: `apps/report-web/index.html`
- Create: `apps/report-web/src/api.ts`
- Create: `apps/report-web/src/pages/report-page.tsx`
- Create: `apps/report-web/src/router.tsx`
- Create: `apps/report-web/src/main.tsx`
- Create: `apps/report-web/src/styles.css`
- Test: `tests/smoke/report-web.test.tsx`

- [ ] **Step 1: Write the failing smoke test for the report viewer**

```tsx
// tests/smoke/report-web.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportPage } from '../../apps/report-web/src/pages/report-page';

describe('report-web', () => {
  it('renders a report loaded from the API', async () => {
    render(
      <ReportPage
        reportId="report_001"
        loadReport={async () => ({
          id: 'report_001',
          opportunityId: 'opp_001',
          title: 'AI Coding Model Procurement Options',
          summary: 'Minimal report shell',
          sections: [
            {
              id: 'sec_001',
              title: 'Why this topic now',
              body: 'Demand is rising.'
            }
          ],
          createdAt: '2026-03-27T12:00:00.000Z'
        })}
      />
    );

    expect(
      await screen.findByRole('heading', {
        name: 'AI Coding Model Procurement Options'
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Demand is rising.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the smoke test and verify it fails**

Run:

```powershell
pnpm test -- tests/smoke/report-web.test.tsx
```

Expected: FAIL because `ReportPage` and the report app do not exist yet.

- [ ] **Step 3: Create the Vite app shell and report client**

```json
// apps/report-web/package.json
{
  "name": "@openfons/report-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3002",
    "build": "vite build",
    "lint": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "preview": "vite preview"
  },
  "dependencies": {
    "@openfons/contracts": "workspace:*",
    "@tanstack/react-router": "^1.114.25",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@vitejs/plugin-react": "^4.4.1",
    "vite": "^6.2.2",
    "vite-tsconfig-paths": "^5.1.4"
  }
}
```

```json
// apps/report-web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true
  },
  "include": ["src/**/*", "vite.config.ts"]
}
```

```ts
// apps/report-web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()]
});
```

```html
<!-- apps/report-web/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OpenFons Report</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```ts
// apps/report-web/src/api.ts
import type { ReportSpec } from '@openfons/contracts';

export type ReportLoader = (reportId: string) => Promise<ReportSpec>;

export const createReportLoader = (baseUrl: string): ReportLoader => async (reportId) => {
  const response = await fetch(`${baseUrl}/api/v1/reports/${reportId}`);

  if (!response.ok) {
    throw new Error('Failed to load report');
  }

  return (await response.json()) as ReportSpec;
};
```

- [ ] **Step 4: Implement the report page UI**

```tsx
// apps/report-web/src/pages/report-page.tsx
import { useEffect, useState } from 'react';
import type { ReportSpec } from '@openfons/contracts';
import { createReportLoader, type ReportLoader } from '../api';

type Props = {
  reportId: string;
  loadReport?: ReportLoader;
};

export const ReportPage = ({
  reportId,
  loadReport = createReportLoader(import.meta.env.VITE_CONTROL_API_BASE_URL ?? 'http://localhost:3001')
}: Props) => {
  const [report, setReport] = useState<ReportSpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadReport(reportId)
      .then((next) => {
        if (!cancelled) {
          setReport(next);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unknown error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadReport, reportId]);

  if (error) {
    return <p className="page-shell">{error}</p>;
  }

  if (!report) {
    return <p className="page-shell">Loading report...</p>;
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">OpenFons Report Delivery</p>
        <h1>{report.title}</h1>
        <p>{report.summary}</p>
      </section>
      {report.sections.map((section) => (
        <article className="section-card" key={section.id}>
          <h2>{section.title}</h2>
          <p>{section.body}</p>
        </article>
      ))}
    </main>
  );
};
```

- [ ] **Step 5: Add the router, entry point, and styles**

```tsx
// apps/report-web/src/router.tsx
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { ReportPage } from './pages/report-page';

const RootLayout = () => (
  <>
    <Outlet />
  </>
);

const rootRoute = createRootRoute({
  component: RootLayout
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <p className="page-shell">Open a report at /reports/$reportId</p>
});

const reportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports/$reportId',
  component: () => {
    const { reportId } = reportRoute.useParams();
    return <ReportPage reportId={reportId} />;
  }
});

const routeTree = rootRoute.addChildren([homeRoute, reportRoute]);

export const router = createRouter({
  routeTree
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

```tsx
// apps/report-web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
```

```css
/* apps/report-web/src/styles.css */
:root {
  font-family: Georgia, "Times New Roman", serif;
  color: #1a2331;
  background: linear-gradient(180deg, #f7f3eb 0%, #efe5d6 100%);
}

body {
  margin: 0;
}

.page-shell {
  min-height: 100vh;
  padding: 32px;
  display: grid;
  gap: 20px;
}

.hero-card,
.section-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 16px 40px rgba(41, 31, 24, 0.08);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #76583b;
}
```

- [ ] **Step 6: Install dependencies and verify the report app**

Run:

```powershell
pnpm install
pnpm test -- tests/smoke/report-web.test.tsx
pnpm --filter @openfons/report-web build
pnpm --filter @openfons/report-web lint
```

Expected: React dependencies install, the smoke test passes, the Vite build succeeds, and TypeScript reports no errors.

- [ ] **Step 7: Commit the report-web shell**

```bash
git add apps/report-web tests/smoke/report-web.test.tsx pnpm-lock.yaml
git commit -m "feat(report-web): add report shell renderer"
```

### Task 8: Add config seeds, local-dev entry points, and Docker verification

**Files:**
- Create: `config/sources/default.json`
- Create: `config/policies/default.json`
- Create: `config/templates/report-default.md`
- Create: `scripts/dev/start-all.ps1`
- Create: `scripts/check/verify.ps1`
- Create: `infra/docker/control-api.Dockerfile`
- Create: `infra/docker/compose.yaml`
- Create: `infra/local-dev/README.md`

- [ ] **Step 1: Create the configuration source-of-truth files**

```json
// config/sources/default.json
{
  "sources": [
    {
      "id": "search",
      "kind": "seed",
      "enabled": true
    },
    {
      "id": "community",
      "kind": "signal",
      "enabled": true
    }
  ]
}
```

```json
// config/policies/default.json
{
  "compilePolicy": {
    "requireEvidenceCount": 2,
    "allowBrowserFallback": false,
    "maxTasksPerWorkflow": 3
  }
}
```

```md
<!-- config/templates/report-default.md -->
# {{title}}

## Summary
{{summary}}

## Sections
{{sections}}
```

- [ ] **Step 2: Create the local developer entry points**

```powershell
# scripts/dev/start-all.ps1
Set-Location "$PSScriptRoot\..\.."
pnpm dev
```

```powershell
# scripts/check/verify.ps1
Set-Location "$PSScriptRoot\..\.."
pnpm check
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

docker compose -f infra/docker/compose.yaml config | Out-Null
Write-Host "verification complete"
```

- [ ] **Step 3: Add the minimal Docker and local-dev docs**

```dockerfile
# infra/docker/control-api.Dockerfile
FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json vitest.config.ts .npmrc ./
COPY packages ./packages
COPY services/control-api ./services/control-api

RUN pnpm install --frozen-lockfile --filter @openfons/control-api...
RUN pnpm -r --filter @openfons/control-api... build

EXPOSE 3001
CMD ["pnpm", "--filter", "@openfons/control-api", "start"]
```

```yaml
# infra/docker/compose.yaml
services:
  control-api:
    build:
      context: ../..
      dockerfile: infra/docker/control-api.Dockerfile
    ports:
      - "3001:3001"
    environment:
      PORT: "3001"
```

```md
<!-- infra/local-dev/README.md -->
# Local Dev

## Ports
- `control-web`: `http://localhost:3000`
- `control-api`: `http://localhost:3001`
- `report-web`: `http://localhost:3002`

## Commands
- Install: `pnpm install`
- Start all: `pwsh ./scripts/dev/start-all.ps1`
- Verify: `pwsh ./scripts/check/verify.ps1`
- API only: `pnpm --filter @openfons/control-api dev`
```

- [ ] **Step 4: Run the full repository verification**

Run:

```powershell
pnpm check
pnpm --filter @openfons/control-api dev
```

Expected: `pnpm check` passes cleanly. After starting the API, open a second terminal and verify the health endpoint and compile flow:

```powershell
Invoke-RestMethod http://localhost:3001/health
$created = Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/v1/opportunities -ContentType 'application/json' -Body '{"title":"AI Coding Model Procurement Options","query":"best ai coding models","market":"global","audience":"engineering leads","problem":"Teams need to compare price and routing options","outcome":"Produce a minimal report shell"}'
$compiled = Invoke-RestMethod -Method Post -Uri \"http://localhost:3001/api/v1/opportunities/$($created.opportunity.id)/compile\"
Invoke-RestMethod -Uri \"http://localhost:3001/api/v1/reports/$($compiled.report.id)\"
```

Expected: the health request returns `{ status = ok }`, the create request returns an opportunity object with status `draft`, the compile request returns a compiled report payload, and the final GET returns the report shell. Then stop the API process.

- [ ] **Step 5: Validate Docker config and commit the final slice**

Run:

```powershell
docker compose -f infra/docker/compose.yaml config
```

Expected: Docker Compose prints a resolved config with one `control-api` service and no schema errors.

```bash
git add config scripts infra
git commit -m "chore(infra): add local-dev and docker entrypoints"
```

## Completion Checklist

- `pnpm install` succeeds from repo root.
- `pnpm check` passes from repo root.
- `tests/contract/*.test.ts` pass.
- `tests/integration/control-api.test.ts` passes.
- `tests/smoke/*.test.tsx` pass.
- `apps/control-web`, `apps/report-web`, and `services/control-api` all build cleanly.
- `control-web -> control-api -> report-web` path is manually smoke-tested once.
- No `worker-*`, `ops-web`, `k8s`, or `terraform` code is created in this plan.
