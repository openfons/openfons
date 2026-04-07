import { resolve } from 'node:path';
import { exportOpenClawRealArtifactReportHtml } from '../../services/control-api/src/report-export/openclaw-artifact-report.js';

const main = async () => {
  const outputPath = resolve(
    process.cwd(),
    'docs/workbench/generated/openclaw-real-artifact-report.html'
  );

  await exportOpenClawRealArtifactReportHtml(outputPath);

  console.log(`Exported OpenClaw artifact report to ${outputPath}`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
