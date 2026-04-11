import type { CompilationResult, ReportView } from '@openfons/contracts';

export const buildReportView = (
  compilation: Pick<
    CompilationResult,
    'report' | 'evidenceSet' | 'sourceCaptures' | 'collectionLogs'
  >
): ReportView => ({
  report: compilation.report,
  evidenceSet: compilation.evidenceSet,
  sourceCaptures: compilation.sourceCaptures,
  collectionLogs: compilation.collectionLogs
});
