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
