import { join, resolve } from 'node:path';
import type { ReportSpec } from '@openfons/contracts';

const normalizePath = (value: string): string => value.replaceAll('\\', '/');

export const resolveAiProcurementReportArtifactPaths = (
  repoRoot: string,
  report: Pick<ReportSpec, 'id' | 'slug'>
) => {
  const relativeDir = normalizePath(
    join('artifacts', 'generated', 'ai-procurement', `${report.slug}-${report.id}`)
  );

  return {
    relativeDir,
    relativePath: `${relativeDir}/report.html`,
    tempRelativePath: `${relativeDir}/report.html.tmp`,
    absoluteDir: resolve(repoRoot, relativeDir),
    absolutePath: resolve(repoRoot, relativeDir, 'report.html'),
    tempAbsolutePath: resolve(repoRoot, relativeDir, 'report.html.tmp')
  };
};
