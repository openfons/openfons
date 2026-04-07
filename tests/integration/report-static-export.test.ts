import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildDirectApiVsOpenRouterReportView,
  exportDirectApiVsOpenRouterWorkbenchHtml
} from '../../services/control-api/src/report-export/static-html.js';
import {
  buildDirectApiVsOpenRouterDeckHtml,
  exportDirectApiVsOpenRouterWorkbenchDeckHtml
} from '../../services/control-api/src/report-export/static-deck.js';
import {
  buildOpenClawRealArtifactReportView,
  exportOpenClawRealArtifactReportHtml
} from '../../services/control-api/src/report-export/openclaw-artifact-report.js';

const tempDirs: string[] = [];
const repoRoot = resolve(__dirname, '..', '..');
const generatedOutput = resolve(
  repoRoot,
  'docs/workbench/generated/direct-api-vs-openrouter.html'
);
const generatedDeckOutput = resolve(
  repoRoot,
  'docs/workbench/generated/direct-api-vs-openrouter-deck.html'
);
const generatedOpenClawOutput = resolve(
  repoRoot,
  'docs/workbench/generated/openclaw-real-artifact-report.html'
);
const tsxCli = resolve(repoRoot, 'node_modules/tsx/dist/cli.mjs');

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

describe('static report export', () => {
  it('builds the direct-api-vs-openrouter workbench report view', async () => {
    const reportView = await buildDirectApiVsOpenRouterReportView();

    expect(reportView.report.title).toBe(
      'Direct API vs OpenRouter for AI Coding Teams'
    );
    expect(reportView.report.summary).toContain('comparison');
    expect(reportView.report.sections.map((section) => section.title)).toEqual(
      expect.arrayContaining([
        'Quick Answer',
        'Executive Summary',
        'Where Direct API Wins',
        'Where OpenRouter Wins',
        'Hidden Costs and Risks',
        'Decision Tree by Team Type'
      ])
    );
    expect(reportView.report.claims.length).toBeGreaterThan(0);
    expect(
      reportView.report.claims.some(
        (claim) => claim.label === 'OpenRouter is not automatically cheaper'
      )
    ).toBe(true);
    expect(reportView.sourceCaptures.length).toBeGreaterThan(0);
    expect(reportView.evidenceSet.items.length).toBeGreaterThan(0);
    expect(reportView.report.evidenceBoundaries).toContain(
      'Do not treat a relay as cheaper unless official pricing and fee caveats are both visible.'
    );
  });

  it('writes a standalone html file for the workbench case', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'openfons-report-export-'));
    tempDirs.push(tempDir);

    const outputPath = join(tempDir, 'direct-api-vs-openrouter.html');

    await exportDirectApiVsOpenRouterWorkbenchHtml(outputPath);

    const html = await readFile(outputPath, 'utf8');

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Direct API vs OpenRouter for AI Coding Teams');
    expect(html).toContain('AI Procurement Decision Guide');
    expect(html).toContain('Executive Summary');
    expect(html).toContain('Where Direct API Wins');
    expect(html).toContain('Where OpenRouter Wins');
    expect(html).toContain('Decision Tree by Team Type');
    expect(html).toContain('OpenRouter is not automatically cheaper');
    expect(html).toContain('Official and corroborating references');
    expect(html).toContain(
      'Do not treat a relay as cheaper unless official pricing and fee caveats are both visible.'
    );
    expect(html).not.toContain('OpenFons Workbench Export');
    expect(html).not.toContain('Capture Log');
  });

  it('runs the export script end-to-end', () => {
    const command = spawnSync(
      process.execPath,
      [tsxCli, 'scripts/workbench/export-direct-api-vs-openrouter.ts'],
      {
        cwd: repoRoot,
        encoding: 'utf8'
      }
    );

    expect(command.status).toBe(0);
    expect(command.stderr).toBe('');
    expect(command.stdout).toContain('Exported static report to');
    expect(existsSync(generatedOutput)).toBe(true);
  });

  it('builds the direct-api-vs-openrouter deck html', async () => {
    const html = await buildDirectApiVsOpenRouterDeckHtml();

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Direct API vs OpenRouter for AI Coding Teams');
    expect(html).toContain(
      'Use official pricing and availability pages to set the baseline'
    );
    expect(html).toContain('OpenAI API pricing');
    expect(html).toContain(
      'Do not publish pricing claims without at least one official pricing capture.'
    );
    expect(html).toContain('class="slide');
  });

  it('writes a standalone deck html file for the workbench case', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'openfons-deck-export-'));
    tempDirs.push(tempDir);

    const outputPath = join(tempDir, 'direct-api-vs-openrouter-deck.html');

    await exportDirectApiVsOpenRouterWorkbenchDeckHtml(outputPath);

    const html = await readFile(outputPath, 'utf8');

    expect(html).toContain('Official direct-buy baseline');
    expect(html).toContain('slide-nav');
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

  it('builds the openclaw real artifact report view from the redeploy batch', async () => {
    const reportView = await buildOpenClawRealArtifactReportView();

    expect(reportView.report.title).toBe(
      'OpenClaw Hosting Real Artifact Batch Report'
    );
    expect(reportView.report.summary).toContain(
      '2026-03-26 redeploy batch'
    );
    expect(reportView.report.thesis).toContain(
      'real artifact batch'
    );
    expect(reportView.report.sections.some((section) =>
      section.body.includes('43')
    )).toBe(true);
    expect(
      reportView.sourceCaptures.some((capture) =>
        capture.title.includes('playwright_search.png')
      )
    ).toBe(true);
    expect(
      reportView.sourceCaptures.some((capture) =>
        capture.title.includes('yt_dlp_search_raw.txt')
      )
    ).toBe(true);
    expect(reportView.evidenceSet.items.length).toBeGreaterThan(0);
  });

  it('writes a standalone html file for the openclaw real artifact batch', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'openfons-openclaw-export-'));
    tempDirs.push(tempDir);

    const outputPath = join(tempDir, 'openclaw-real-artifact-report.html');

    await exportOpenClawRealArtifactReportHtml(outputPath);

    const html = await readFile(outputPath, 'utf8');

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('OpenClaw Hosting Real Artifact Batch Report');
    expect(html).toContain('openclaw 最合适的服务器虚拟主机');
    expect(html).toContain('43');
    expect(html).toContain('playwright_search.png');
    expect(html).toContain('yt_dlp_search_raw.txt');
    expect(html).toContain('Capture Log');
    expect(html).toContain(
      'labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored/success/playwright_search.png'
    );
  });

  it('runs the openclaw real artifact export script end-to-end', () => {
    const command = spawnSync(
      process.execPath,
      [tsxCli, 'scripts/workbench/export-openclaw-real-artifact-report.ts'],
      {
        cwd: repoRoot,
        encoding: 'utf8'
      }
    );

    expect(command.status).toBe(0);
    expect(command.stderr).toBe('');
    expect(command.stdout).toContain('Exported OpenClaw artifact report to');
    expect(existsSync(generatedOpenClawOutput)).toBe(true);
  });
});
