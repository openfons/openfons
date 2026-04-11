import { describe, expect, it } from 'vitest';
import {
  resolveAiProcurementReportArtifactPaths
} from '../../services/control-api/src/artifacts/paths.js';
import { buildReportView } from '../../services/control-api/src/artifacts/report-view.js';
import { buildAiProcurementCase } from '../../services/control-api/src/cases/ai-procurement.js';
import { buildCompilation, buildOpportunity } from '../../services/control-api/src/compiler.js';
import { DIRECT_API_VS_OPENROUTER_INPUT } from '../../services/control-api/src/report-export/static-html.js';

describe('control-api artifacts helpers', () => {
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
});
