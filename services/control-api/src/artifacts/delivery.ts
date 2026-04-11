import type { CompilationResult } from '@openfons/contracts';
import { buildReportView } from './report-view.js';
import { writeReportHtmlArtifact } from './report-html.js';

export const deliverAiProcurementCompilation = async (
  compilation: CompilationResult,
  options: { repoRoot: string }
): Promise<CompilationResult> => {
  const reportView = buildReportView(compilation);
  const reportArtifact = await writeReportHtmlArtifact({
    repoRoot: options.repoRoot,
    topicRunId: compilation.topicRun.id,
    reportView
  });

  return {
    ...compilation,
    artifacts: compilation.artifacts
      .filter((artifact) => artifact.type !== 'report')
      .concat(reportArtifact)
  };
};
