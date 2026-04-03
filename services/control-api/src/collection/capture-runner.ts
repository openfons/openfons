import { execFile } from 'node:child_process';
import type {
  CollectionLog,
  SourceCapture,
} from '@openfons/contracts';
import {
  createCollectionLog,
  createSourceCapture
} from '@openfons/domain-models';

export type CapturePlan = {
  topicRunId: string;
  title: string;
  url: string;
  snippet: string;
  sourceKind: SourceCapture['sourceKind'];
  useAs: SourceCapture['useAs'];
  reportability: SourceCapture['reportability'];
  riskLevel: SourceCapture['riskLevel'];
  captureType: SourceCapture['captureType'];
  language: string;
  region: string;
};

export type CaptureRunner = (
  plans: CapturePlan[]
) => Promise<{
  sourceCaptures: SourceCapture[];
  collectionLogs: CollectionLog[];
}>;

type CaptureStrategy = 'http' | 'openai-rsc' | 'curl' | 'browser-dom';

type LoadedCapture = {
  body: string;
  strategy: CaptureStrategy;
  usedFallback: boolean;
};

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

const DEFAULT_MAX_BUFFER = 25 * 1024 * 1024;

const WINDOWS_BROWSER_CANDIDATES = [
  process.env.OPENFONS_BROWSER_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'chrome.exe',
  'msedge.exe'
];

const POSIX_BROWSER_CANDIDATES = [
  process.env.OPENFONS_BROWSER_PATH,
  'google-chrome',
  'chromium',
  'chromium-browser',
  'microsoft-edge',
  'msedge'
];

const CURL_CANDIDATES = [process.env.OPENFONS_CURL_PATH, 'curl', 'curl.exe'];

const isOpenAiPricingUrl = (url: URL) =>
  url.hostname === 'openai.com' && url.pathname.includes('/api/pricing');

const isOpenAiHelpUrl = (url: URL) => url.hostname === 'help.openai.com';

const isGeminiDocsUrl = (url: URL) =>
  url.hostname === 'ai.google.dev' && url.pathname.includes('/gemini-api/docs/');

const isCloudflareChallengeBody = (body: string) =>
  body.includes('__cf_chl_opt') ||
  body.includes('cf-turnstile-response') ||
  body.includes('Enable JavaScript and cookies to continue') ||
  body.includes('Please wait while') ||
  body.includes('请稍候');

const runCommand = async (candidates: Array<string | undefined>, args: string[]) => {
  let lastError: Error | undefined;

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      const stdout = await new Promise<string>((resolve, reject) => {
        execFile(
          candidate,
          args,
          {
            windowsHide: true,
            maxBuffer: DEFAULT_MAX_BUFFER
          },
          (error, stdoutText, stderrText) => {
            if (!error) {
              resolve(stdoutText);
              return;
            }

            if (stdoutText.trim().length > 0) {
              resolve(stdoutText);
              return;
            }

            const details = stderrText.trim() || error.message;
            reject(
              new Error(`${candidate} failed: ${details}`)
            );
          }
        );
      });

      if (stdout.trim().length > 0) {
        return stdout;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('no command candidates produced output');
};

const runCurlCapture = async (url: string) =>
  runCommand(CURL_CANDIDATES, [
    '--location',
    '--silent',
    '--show-error',
    '--ssl-no-revoke',
    '--user-agent',
    DEFAULT_USER_AGENT,
    url
  ]);

const dumpBrowserDom = async (url: string) =>
  runCommand(
    process.platform === 'win32'
      ? WINDOWS_BROWSER_CANDIDATES
      : POSIX_BROWSER_CANDIDATES,
    ['--headless', '--disable-gpu', '--no-first-run', '--dump-dom', url]
  );

const stripMarkup = (input: string) =>
  input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripTransportNoise = (input: string) =>
  input
    .replace(/\d+:\s*/g, ' ')
    .replace(/I\[[^\]]+\]/g, ' ')
    .replace(/\$S[a-z.]+/gi, ' ')
    .replace(/[_$][\w./:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractQuotedFragments = (input: string) => {
  const matches = input.match(/"((?:\\.|[^"\\])+)"/g) ?? [];

  return matches
    .map((match) => {
      try {
        return JSON.parse(match);
      } catch {
        return '';
      }
    })
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter(
      (value) =>
        value.length >= 18 &&
        /[A-Za-z]/.test(value) &&
        !value.startsWith('http') &&
        !value.startsWith('/') &&
        !value.startsWith('$') &&
        !value.includes('static/chunks') &&
        !value.includes('analyticsIdentifier')
    );
};

const summarizeRsc = ({
  body,
  snippet,
  title
}: {
  body: string;
  snippet: string;
  title: string;
}) => {
  const fragments = extractQuotedFragments(body);
  const prioritized =
    fragments.find((value) => /pricing|price|token|rate|cost/i.test(value)) ??
    fragments[0];

  if (prioritized) {
    return prioritized.slice(0, 220);
  }

  const cleaned = stripTransportNoise(body);

  if (cleaned.length > 0) {
    return cleaned.slice(0, 220);
  }

  if (snippet.trim().length > 0) {
    return snippet.trim();
  }

  return title;
};

const summarizePage = ({
  body,
  strategy,
  snippet,
  title
}: {
  body: string;
  strategy: CaptureStrategy;
  snippet: string;
  title: string;
}) => {
  if (strategy === 'openai-rsc') {
    return summarizeRsc({ body, snippet, title });
  }

  const stripped = stripMarkup(body);

  if (stripped.length > 0) {
    return stripped.slice(0, 220);
  }

  if (snippet.trim().length > 0) {
    return snippet.trim();
  }

  return title;
};

const loadViaHttp = async (fetchImpl: typeof fetch, url: string) => {
  const response = await fetchImpl(url, {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': DEFAULT_USER_AGENT
    },
    redirect: 'follow'
  });
  const body = await response.text();

  return { response, body };
};

const loadViaHttpWithRetry = async (
  fetchImpl: typeof fetch,
  url: string,
  attempts: number
) => {
  let lastResult: Awaited<ReturnType<typeof loadViaHttp>> | undefined;

  for (let index = 0; index < attempts; index += 1) {
    lastResult = await loadViaHttp(fetchImpl, url);

    if (lastResult.response.ok && !isCloudflareChallengeBody(lastResult.body)) {
      return lastResult;
    }
  }

  if (!lastResult) {
    throw new Error(`capture failed for ${url}: no http attempts executed`);
  }

  return lastResult;
};

const loadOpenAiRsc = async (fetchImpl: typeof fetch, url: string): Promise<LoadedCapture> => {
  const rscUrl = new URL(url);
  rscUrl.searchParams.set('_rsc', 'openfons');

  const response = await fetchImpl(rscUrl.toString(), {
    headers: {
      'rsc': '1',
      'user-agent': DEFAULT_USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`openai rsc capture failed: ${response.status}`);
  }

  return {
    body: await response.text(),
    strategy: 'openai-rsc',
    usedFallback: true
  };
};

const loadOpenAiHelpFallback = async ({
  url,
  runCurl,
  browserDumpDom
}: {
  url: string;
  runCurl: (url: string) => Promise<string>;
  browserDumpDom: (url: string) => Promise<string>;
}): Promise<LoadedCapture> => {
  try {
    return {
      body: await runCurl(url),
      strategy: 'curl',
      usedFallback: true
    };
  } catch {
    return {
      body: await browserDumpDom(url),
      strategy: 'browser-dom',
      usedFallback: true
    };
  }
};

const loadCaptureBody = async ({
  fetchImpl,
  plan,
  runCurl = runCurlCapture,
  browserDumpDom = dumpBrowserDom
}: {
  fetchImpl: typeof fetch;
  plan: CapturePlan;
  runCurl?: (url: string) => Promise<string>;
  browserDumpDom?: (url: string) => Promise<string>;
}): Promise<LoadedCapture> => {
  const parsedUrl = new URL(plan.url);

  try {
    const { response, body } = await loadViaHttpWithRetry(
      fetchImpl,
      plan.url,
      isOpenAiHelpUrl(parsedUrl) ? 2 : 1
    );

    if (response.ok && !isCloudflareChallengeBody(body)) {
      return {
        body,
        strategy: 'http',
        usedFallback: false
      };
    }

    if (isOpenAiPricingUrl(parsedUrl)) {
      return loadOpenAiRsc(fetchImpl, plan.url);
    }

    if (isOpenAiHelpUrl(parsedUrl)) {
      return loadOpenAiHelpFallback({
        url: plan.url,
        runCurl,
        browserDumpDom
      });
    }

    if (isGeminiDocsUrl(parsedUrl)) {
      return {
        body: await browserDumpDom(plan.url),
        strategy: 'browser-dom',
        usedFallback: true
      };
    }

    throw new Error(`capture failed for ${plan.url}: ${response.status}`);
  } catch (error) {
    if (isOpenAiHelpUrl(parsedUrl)) {
      return loadOpenAiHelpFallback({
        url: plan.url,
        runCurl,
        browserDumpDom
      });
    }

    if (isGeminiDocsUrl(parsedUrl)) {
      return {
        body: await browserDumpDom(plan.url),
        strategy: 'browser-dom',
        usedFallback: true
      };
    }

    if (isOpenAiPricingUrl(parsedUrl)) {
      return loadOpenAiRsc(fetchImpl, plan.url);
    }

    throw error;
  }
};

export const createCaptureRunner = ({
  fetchImpl = fetch,
  runCurl = runCurlCapture,
  browserDumpDom = dumpBrowserDom
}: {
  fetchImpl?: typeof fetch;
  runCurl?: (url: string) => Promise<string>;
  browserDumpDom?: (url: string) => Promise<string>;
} = {}): CaptureRunner => async (plans) => {
  const sourceCaptures: SourceCapture[] = [];
  const collectionLogs: CollectionLog[] = [];

  for (const plan of plans) {
    const { body, strategy, usedFallback } = await loadCaptureBody({
      fetchImpl,
      plan,
      runCurl,
      browserDumpDom
    });
    const capture = createSourceCapture({
      topicRunId: plan.topicRunId,
      title: plan.title,
      url: plan.url,
      sourceKind: plan.sourceKind,
      useAs: plan.useAs,
      reportability: plan.reportability,
      riskLevel: plan.riskLevel,
      captureType: plan.captureType,
      language: plan.language,
      region: plan.region,
      summary: summarizePage({
        body,
        strategy,
        snippet: plan.snippet,
        title: plan.title
      })
    });

    sourceCaptures.push(capture);
    if (usedFallback) {
      collectionLogs.push(
        createCollectionLog({
          topicRunId: plan.topicRunId,
          captureId: capture.id,
          step: 'capture',
          status: 'warning',
          message: `Capture ${capture.title} used ${strategy} fallback`
        })
      );
    }
    collectionLogs.push(
      createCollectionLog({
        topicRunId: plan.topicRunId,
        captureId: capture.id,
        step: 'capture',
        status: 'success',
        message: `Captured ${capture.title} via ${strategy} real collection bridge`
      })
    );
  }

  return {
    sourceCaptures,
    collectionLogs
  };
};
