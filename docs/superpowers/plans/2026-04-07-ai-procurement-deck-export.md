# AI Procurement Deck Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second generated artifact, `docs/workbench/generated/direct-api-vs-openrouter-deck.html`, sourced from the existing AI procurement `ReportView`.

**Architecture:** Reuse the existing `buildDirectApiVsOpenRouterReportView()` pipeline, add a new slide-oriented HTML renderer in a separate exporter module, and expose it through a dedicated workbench script. Keep the report export and deck export separate so each delivery surface stays clear.

**Tech Stack:** TypeScript, Vitest, Node file output, zero-dependency HTML/CSS/JS.

---

### Task 1: Add deck export tests first

**Files:**
- Modify: `tests/integration/report-static-export.test.ts`
- Test: `tests/integration/report-static-export.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import {
  buildDirectApiVsOpenRouterDeckHtml,
  exportDirectApiVsOpenRouterWorkbenchDeckHtml
} from '../../services/control-api/src/report-export/static-deck.js';

const generatedDeckOutput = resolve(
  repoRoot,
  'docs/workbench/generated/direct-api-vs-openrouter-deck.html'
);

it('builds the direct-api-vs-openrouter deck html', async () => {
  const html = await buildDirectApiVsOpenRouterDeckHtml();

  expect(html).toContain('<!doctype html>');
  expect(html).toContain('Direct API vs OpenRouter for AI Coding Teams');
  expect(html).toContain('Use official pricing and availability pages');
  expect(html).toContain('OpenAI API pricing');
  expect(html).toContain('Do not publish pricing claims without at least one official pricing capture.');
});

it('writes a standalone deck html file for the workbench case', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'openfons-deck-export-'));
  tempDirs.push(tempDir);

  const outputPath = join(tempDir, 'direct-api-vs-openrouter-deck.html');

  await exportDirectApiVsOpenRouterWorkbenchDeckHtml(outputPath);

  const html = await readFile(outputPath, 'utf8');

  expect(html).toContain('slide');
  expect(html).toContain('Official direct-buy baseline');
});

it('runs the deck export script end-to-end', () => {
  const command = spawnSync(
    process.execPath,
    [tsxCli, 'scripts/workbench/export-direct-api-vs-openrouter-deck.ts'],
    {
      cwd: repoRoot,
      encoding: 'utf8'
    }
  );

  expect(command.status).toBe(0);
  expect(command.stderr).toBe('');
  expect(command.stdout).toContain('Exported deck report to');
  expect(existsSync(generatedDeckOutput)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/integration/report-static-export.test.ts`

Expected: FAIL with `Cannot find module '../../services/control-api/src/report-export/static-deck.js'`.

- [ ] **Step 3: Commit the red test**

```bash
git add tests/integration/report-static-export.test.ts
git commit -m "test: cover ai procurement deck export"
```

### Task 2: Implement the deck renderer

**Files:**
- Create: `services/control-api/src/report-export/static-deck.ts`
- Modify: `services/control-api/src/report-export/static-html.ts`
- Test: `tests/integration/report-static-export.test.ts`

- [ ] **Step 1: Write the minimal deck exporter**

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ReportView } from '@openfons/contracts';
import { buildDirectApiVsOpenRouterReportView } from './static-html.js';

export const renderStaticDeckHtml = (reportView: ReportView): string => {
  const report = reportView.report;
  return `<!doctype html>
<html lang="en">
  <head>...</head>
  <body>
    <main class="deck">
      <section class="slide title-slide">...</section>
      <section class="slide thesis-slide">...</section>
      <section class="slide claims-slide">...</section>
      <section class="slide sources-slide">...</section>
      <section class="slide boundaries-slide">...</section>
      <section class="slide closing-slide">...</section>
      <script>...</script>
    </main>
  </body>
</html>`;
};

export const buildDirectApiVsOpenRouterDeckHtml = async (): Promise<string> => {
  const reportView = await buildDirectApiVsOpenRouterReportView();
  return renderStaticDeckHtml(reportView);
};

export const exportDirectApiVsOpenRouterWorkbenchDeckHtml = async (
  outputPath: string
): Promise<string> => {
  const html = await buildDirectApiVsOpenRouterDeckHtml();
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, 'utf8');
  return html;
};
```

- [ ] **Step 2: Keep shared report data entrypoint reusable**

```ts
// static-html.ts
export const buildDirectApiVsOpenRouterReportView = async (): Promise<ReportView> => {
  // unchanged source-of-truth helper reused by report and deck exporters
};
```

- [ ] **Step 3: Run targeted tests to verify they pass**

Run: `pnpm exec vitest run tests/integration/report-static-export.test.ts`

Expected: PASS with deck export tests and existing report export tests all green.

- [ ] **Step 4: Commit the deck exporter**

```bash
git add services/control-api/src/report-export/static-html.ts services/control-api/src/report-export/static-deck.ts tests/integration/report-static-export.test.ts
git commit -m "feat: add ai procurement deck exporter"
```

### Task 3: Add the export script and generate the artifact

**Files:**
- Create: `scripts/workbench/export-direct-api-vs-openrouter-deck.ts`
- Modify: `package.json`
- Create: `docs/workbench/generated/direct-api-vs-openrouter-deck.html`
- Test: `tests/integration/report-static-export.test.ts`

- [ ] **Step 1: Add the workbench export script**

```ts
import { resolve } from 'node:path';
import { exportDirectApiVsOpenRouterWorkbenchDeckHtml } from '../../services/control-api/src/report-export/static-deck.js';

const main = async () => {
  const outputPath = resolve(
    process.cwd(),
    'docs/workbench/generated/direct-api-vs-openrouter-deck.html'
  );

  await exportDirectApiVsOpenRouterWorkbenchDeckHtml(outputPath);
  console.log(`Exported deck report to ${outputPath}`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Register the package script**

```json
{
  "scripts": {
    "export:workbench:direct-api-vs-openrouter": "tsx scripts/workbench/export-direct-api-vs-openrouter.ts",
    "export:workbench:direct-api-vs-openrouter-deck": "tsx scripts/workbench/export-direct-api-vs-openrouter-deck.ts"
  }
}
```

- [ ] **Step 3: Run the export command to generate the artifact**

Run: `pnpm export:workbench:direct-api-vs-openrouter-deck`

Expected: stdout contains `Exported deck report to` and the file `docs/workbench/generated/direct-api-vs-openrouter-deck.html` exists.

- [ ] **Step 4: Run regression verification**

Run: `pnpm exec vitest run tests/integration/report-static-export.test.ts tests/integration/control-api.test.ts tests/smoke/report-web.test.tsx`

Expected: PASS with 0 failures.

- [ ] **Step 5: Run typecheck**

Run: `pnpm typecheck`

Expected: PASS across workspace packages.

- [ ] **Step 6: Commit the script and generated artifact**

```bash
git add package.json scripts/workbench/export-direct-api-vs-openrouter-deck.ts docs/workbench/generated/direct-api-vs-openrouter-deck.html
git commit -m "feat: export ai procurement deck html"
```
