import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bootstrapCrawlerRoutePreflight,
  createCrawlerRoutePreflightReport,
  type CrawlerRoutePreflightOptions
} from '../../services/control-api/src/collection/crawler-execution/preflight.js';

type DoctorRoute = 'youtube' | 'tiktok' | 'hacker-news';

const parseArgs = (args: string[]) => {
  const route = args[args.indexOf('--route') + 1] as DoctorRoute | undefined;
  const projectId = args.includes('--project')
    ? args[args.indexOf('--project') + 1]
    : 'openfons';
  const secretRoot = args.includes('--secret-root')
    ? path.resolve(process.cwd(), args[args.indexOf('--secret-root') + 1])
    : process.env.OPENFONS_SECRET_ROOT;
  const bootstrapMissing = args.includes('--bootstrap-missing');

  if (route !== 'youtube' && route !== 'tiktok' && route !== 'hacker-news') {
    throw new Error(
      'usage: --route youtube|tiktok|hacker-news [--project openfons] [--secret-root path] [--bootstrap-missing]'
    );
  }

  return {
    route,
    projectId,
    secretRoot,
    bootstrapMissing
  };
};

export const runDoctorCommand = async ({
  args = process.argv.slice(2),
  exitHandler = (code: number) => {
    process.exitCode = code;
  },
  commandExists
}: {
  args?: string[];
  exitHandler?: (code: number) => void;
  commandExists?: CrawlerRoutePreflightOptions['commandExists'];
} = {}) => {
  const parsed = parseArgs(args);
  const baseOptions = {
    projectId: parsed.projectId,
    routeKey: parsed.route,
    repoRoot: process.cwd(),
    secretRoot: parsed.secretRoot,
    commandExists
  };
  const report = parsed.bootstrapMissing
    ? bootstrapCrawlerRoutePreflight(baseOptions)
    : createCrawlerRoutePreflightReport(baseOptions);

  console.log(JSON.stringify(report, null, 2));
  exitHandler(report.status === 'blocked' ? 1 : 0);

  return report;
};

const main = async () => {
  try {
    await runDoctorCommand();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
};

const isDirectExecution = () => {
  if (!process.argv[1]) {
    return false;
  }

  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
};

if (isDirectExecution()) {
  void main();
}
