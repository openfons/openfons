import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  resolveAiProcurementReportArtifactPaths
} from '../../services/control-api/src/artifacts/paths.js';
import { deliverAiProcurementCompilation } from '../../services/control-api/src/artifacts/delivery.js';
import { buildReportView } from '../../services/control-api/src/artifacts/report-view.js';
import { writeReportHtmlArtifact } from '../../services/control-api/src/artifacts/report-html.js';
import { buildAiProcurementCase } from '../../services/control-api/src/cases/ai-procurement.js';
import { buildCompilation, buildOpportunity } from '../../services/control-api/src/compiler.js';
import { DIRECT_API_VS_OPENROUTER_INPUT } from '../../services/control-api/src/report-export/static-html.js';

describe('control-api artifacts helpers', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
    );
  });

  it('builds normalized ai procurement report artifact paths', () => {
    const report = {
      id: 'report_001',
      slug: 'direct-api-vs-openrouter'
    };

    const paths = resolveAiProcurementReportArtifactPaths(
      'D:\\demo\\demo1\\openfons',
      report
    );

    expect(paths.relativePath).toBe(
      'artifacts/generated/ai-procurement/direct-api-vs-openrouter-report_001/report.html'
    );
    expect(paths.tempRelativePath).toBe(
      'artifacts/generated/ai-procurement/direct-api-vs-openrouter-report_001/report.html.tmp'
    );
    expect(paths.relativeDir.includes('\\')).toBe(false);
    expect(paths.relativePath.includes('\\')).toBe(false);
    expect(paths.tempRelativePath.includes('\\')).toBe(false);
  });

  it('builds canonical report view from a compilation-shaped object', async () => {
    const opportunity = buildOpportunity(DIRECT_API_VS_OPENROUTER_INPUT);
    const compilation = await buildCompilation(opportunity, {
      buildAiProcurementCaseBundle: async (nextOpportunity, workflow) =>
        buildAiProcurementCase(nextOpportunity, workflow)
    });

    const reportView = buildReportView(compilation);

    expect(reportView).toEqual({
      report: compilation.report,
      evidenceSet: compilation.evidenceSet,
      sourceCaptures: compilation.sourceCaptures,
      collectionLogs: compilation.collectionLogs
    });
  });

  it('keeps buildCompilation provisional with memory-backed report artifact', async () => {
    const opportunity = buildOpportunity(DIRECT_API_VS_OPENROUTER_INPUT);
    const compilation = await buildCompilation(opportunity, {
      buildAiProcurementCaseBundle: async (nextOpportunity, workflow) =>
        buildAiProcurementCase(nextOpportunity, workflow)
    });
    const reportArtifact = compilation.artifacts.find(
      (artifact) => artifact.type === 'report'
    );

    expect(reportArtifact).toBeDefined();
    expect(reportArtifact?.storage).toBe('memory');
    expect(reportArtifact?.uri).toBe(`memory://report/${compilation.report.id}`);
  });

  it('writes finalized file-backed report artifact with report html and replaces provisional report artifact', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'openfons-artifacts-'));
    tempDirs.push(repoRoot);
    const opportunity = buildOpportunity(DIRECT_API_VS_OPENROUTER_INPUT);
    const compilation = await buildCompilation(opportunity, {
      buildAiProcurementCaseBundle: async (nextOpportunity, workflow) =>
        buildAiProcurementCase(nextOpportunity, workflow)
    });
    const withNonReportArtifact = {
      ...compilation,
      artifacts: compilation.artifacts.concat({
        ...compilation.artifacts[0],
        id: `${compilation.artifacts[0].id}-non-report`,
        type: 'opportunity',
        uri: 'memory://opportunity/test'
      })
    };

    const delivered = await deliverAiProcurementCompilation(withNonReportArtifact, {
      repoRoot
    });
    const reportArtifact = delivered.artifacts.find(
      (artifact) => artifact.type === 'report'
    );

    expect(reportArtifact).toBeDefined();
    expect(reportArtifact?.storage).toBe('file');
    expect(reportArtifact?.uri).toBe(
      resolveAiProcurementReportArtifactPaths(repoRoot, compilation.report).relativePath
    );
    expect(
      delivered.artifacts.find((artifact) => artifact.type === 'opportunity')
    ).toBeDefined();

    const artifactHtml = await readFile(join(repoRoot, reportArtifact!.uri), 'utf8');
    expect(artifactHtml).toContain('<!doctype html>');
    expect(artifactHtml).toContain(compilation.report.title);
  });

  it('removes report.html.tmp when write/rename fails', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'openfons-artifacts-'));
    tempDirs.push(repoRoot);
    const opportunity = buildOpportunity(DIRECT_API_VS_OPENROUTER_INPUT);
    const compilation = await buildCompilation(opportunity, {
      buildAiProcurementCaseBundle: async (nextOpportunity, workflow) =>
        buildAiProcurementCase(nextOpportunity, workflow)
    });
    const reportView = buildReportView(compilation);
    const paths = resolveAiProcurementReportArtifactPaths(repoRoot, compilation.report);
    await mkdir(paths.absoluteDir, { recursive: true });
    await mkdir(paths.absolutePath, { recursive: true });

    await expect(
      writeReportHtmlArtifact({
        repoRoot,
        topicRunId: compilation.topicRun.id,
        reportView
      })
    ).rejects.toBeDefined();

    await expect(stat(paths.tempAbsolutePath)).rejects.toBeDefined();
  });

  it('reuses artifact path for same report id and overwrites stale html on second delivery', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'openfons-artifacts-'));
    tempDirs.push(repoRoot);
    const opportunity = buildOpportunity(DIRECT_API_VS_OPENROUTER_INPUT);
    const compilation = await buildCompilation(opportunity, {
      buildAiProcurementCaseBundle: async (nextOpportunity, workflow) =>
        buildAiProcurementCase(nextOpportunity, workflow)
    });

    const first = await deliverAiProcurementCompilation(compilation, { repoRoot });
    const firstReportArtifact = first.artifacts.find((artifact) => artifact.type === 'report');
    const firstArtifactPath = join(repoRoot, firstReportArtifact!.uri);
    await writeFile(firstArtifactPath, 'STALE_HTML', 'utf8');

    const second = await deliverAiProcurementCompilation(compilation, { repoRoot });
    const secondReportArtifact = second.artifacts.find(
      (artifact) => artifact.type === 'report'
    );
    const secondArtifactPath = join(repoRoot, secondReportArtifact!.uri);
    const rewrittenHtml = await readFile(secondArtifactPath, 'utf8');

    expect(secondReportArtifact?.uri).toBe(firstReportArtifact?.uri);
    expect(secondArtifactPath).toBe(firstArtifactPath);
    expect(rewrittenHtml).not.toContain('STALE_HTML');
    expect(rewrittenHtml).toContain(compilation.report.title);
  });
});
