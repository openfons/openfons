import { resolve } from 'node:path';
import { exportDirectApiVsOpenRouterWorkbenchHtml } from '../../services/control-api/src/report-export/static-html.js';

const main = async () => {
  const outputPath = resolve(
    process.cwd(),
    'docs/workbench/generated/direct-api-vs-openrouter.html'
  );

  await exportDirectApiVsOpenRouterWorkbenchHtml(outputPath);

  console.log(`Exported static report to ${outputPath}`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
