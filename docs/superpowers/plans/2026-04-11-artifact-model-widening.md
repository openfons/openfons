I'm using the writing-plans skill to create the implementation plan.
# Artifact Model Widening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow domain artifacts to explicitly choose `memory` or `file` storage in both helpers and fixtures while keeping the contract schema unchanged.

**Architecture:** Introduce a lightweight `CreateArtifactOptions` bag that only carries `storage`, keep `Artifact` creation deterministic, and reflect a file-backed artifact in the compilation fixture. Work in the current workspace because the repository explicitly forbids creating new git worktrees for this task.

**Tech Stack:** TypeScript (packages/domain-models), Vitest-focused contract tests, `pnpm` for script execution.

---

### Task 1: Domain artifact storage widening

**Files:**
- Modify: `packages/domain-models/src/index.ts`
- Modify: `tests/contract/domain-models.test.ts`
- Modify: `tests/contract/contracts-schema.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test to `tests/contract/domain-models.test.ts` that creates both a default memory-backed artifact and one that requests `storage: 'file'`. Then, in `tests/contract/contracts-schema.test.ts`, point the compilation artifact fixture at the repo-relative HTML path and specify `storage: 'file'` so the `CompilationResultSchema` still parses.

```ts
it('creates both memory and file-backed artifacts explicitly', () => {
  const topicRun = createTopicRun('opp_001', 'wf_001', 'ai-procurement');

  const memoryArtifact = createArtifact(
    topicRun.id,
    'report',
    `memory://report/report_001`,
    'report_001'
  );

  const fileArtifact = createArtifact(
    topicRun.id,
    'report',
    'artifacts/generated/ai-procurement/direct-api-vs-openrouter-report_001/report.html',
    'report_001',
    { storage: 'file' }
  );

  expect(memoryArtifact.storage).toBe('memory');
  expect(fileArtifact.storage).toBe('file');
});
```

Update the `artifacts` fixture in `tests/contract/contracts-schema.test.ts` so the single artifact object becomes:

```ts
{
  id: 'art_001',
  topicRunId: 'run_001',
  reportId: 'report_001',
  type: 'report' as const,
  storage: 'file' as const,
  uri: 'artifacts/generated/ai-procurement/direct-api-vs-openrouter-ai-coding-report_001/report.html',
  createdAt: '2026-03-30T08:10:00.000Z'
}
```

- [ ] **Step 2: Run the failing tests**

Run `pnpm test -- tests/contract/domain-models.test.ts tests/contract/contracts-schema.test.ts` expecting it to fail because `createArtifact()` still forces `storage: 'memory'` and the fixture path differs.

- [ ] **Step 3: Implement minimal domain model changes**

Add `CreateArtifactOptions` and update `createArtifact()` so callers can pass an optional `storage` (defaulting to `'memory'`). Keep all other artifact properties the same.

```ts
type CreateArtifactOptions = {
  storage?: ArtifactStorage;
};

export const createArtifact = (
  topicRunId: string,
  type: ArtifactType,
  uri: string,
  reportId?: string,
  options: CreateArtifactOptions = {}
): Artifact => ({
  id: createId('art'),
  topicRunId,
  reportId,
  type,
  storage: options.storage ?? 'memory',
  uri,
  createdAt: nowIso()
});
```

Also ensure the finalized compilation fixture now refers to the repo-relative path with `storage: 'file'` (as already edited in Step 1) so `CompilationResultSchema` still verifies.

- [ ] **Step 4: Run the focused tests again**

Run `pnpm test -- tests/contract/domain-models.test.ts tests/contract/contracts-schema.test.ts` and expect both tests to pass now that the storage option exists and the fixture matches.

- [ ] **Step 5: Commit**

```
git add packages/domain-models/src/index.ts tests/contract/domain-models.test.ts tests/contract/contracts-schema.test.ts
git commit -m "feat: widen artifact storage options"
```

Plan complete and saved to `docs/superpowers/plans/2026-04-11-artifact-model-widening.md`. Two execution options:

1. Subagent-Driven (recommended) - Dispatch a subagent per plan step using `superpowers:subagent-driven-development` for rapid iteration and separate reviews.
2. Inline Execution - Carry out the task in this session using `superpowers:executing-plans` with grouped checkpoints.

Which approach?
