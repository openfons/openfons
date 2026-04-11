import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import type { Artifact, ReportView } from '@openfons/contracts';
import { createArtifact } from '@openfons/domain-models';
import { renderStaticReportHtml } from '../report-export/static-html.js';
import { resolveAiProcurementReportArtifactPaths } from './paths.js';

export const writeReportHtmlArtifact = async ({
  repoRoot,
  topicRunId,
  reportView
}: {
  repoRoot: string;
  topicRunId: string;
  reportView: ReportView;
}): Promise<Artifact> => {
  const location = resolveAiProcurementReportArtifactPaths(repoRoot, reportView.report);
  const html = renderStaticReportHtml(reportView, {
    eyebrow: 'AI Procurement Decision Guide',
    narrativeTitle: 'Decision Guide',
    narrativeMeta: 'Decision points backed by the compiled evidence set',
    sourcesMeta: 'Official and corroborating references',
    footerNote: 'Generated from the OpenFons evidence-backed report pipeline.'
  });

  await mkdir(location.absoluteDir, { recursive: true });

  try {
    await writeFile(location.tempAbsolutePath, html, 'utf8');
    await rename(location.tempAbsolutePath, location.absolutePath);
  } catch (error) {
    await rm(location.tempAbsolutePath, { force: true });
    throw error;
  }

  return createArtifact(
    topicRunId,
    'report',
    location.relativePath,
    reportView.report.id,
    { storage: 'file' }
  );
};
