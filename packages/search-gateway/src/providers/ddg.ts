import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProviderRawResult, SearchProviderAdapter } from './base.js';

export type DdgSearchInput = {
  query: string;
  page: number;
  maxResults: number;
};

export type DdgSearchImpl = (
  input: DdgSearchInput
) => Promise<ProviderRawResult[]>;

const moduleDirname =
  typeof import.meta.dirname === 'string'
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDirname, '../../../..');
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;
const DEFAULT_DDGS_TIMEOUT_MS = 60 * 1000;

const DDGS_QUERY_SCRIPT = [
  'import json, sys',
  'from ddgs import DDGS',
  'query = sys.argv[1]',
  'page = int(sys.argv[2])',
  'max_results = int(sys.argv[3])',
  'results = DDGS().text(query, max_results=page * max_results)',
  'start = (page - 1) * max_results',
  'window = results[start:start + max_results]',
  'payload = []',
  'for index, item in enumerate(window):',
  '    payload.append({',
  '        "title": item.get("title", ""),',
  '        "url": item.get("href", ""),',
  '        "snippet": item.get("body", ""),',
  '        "rank": start + index + 1,',
  '        "page": page,',
  '    })',
  'print(json.dumps(payload))'
].join('\n');

const PYTHON_CANDIDATES =
  process.platform === 'win32'
    ? [
        process.env.OPENFONS_DDGS_PYTHON,
        path.join(
          repoRoot,
          'labs',
          'collector-compat',
          '.venv',
          'Scripts',
          'python.exe'
        ),
        'python.exe',
        'python'
      ]
    : [
        process.env.OPENFONS_DDGS_PYTHON,
        path.join(repoRoot, 'labs', 'collector-compat', '.venv', 'bin', 'python'),
        'python3',
        'python'
      ];

const normalizeResultText = (value: string) => value.replace(/\s+/g, ' ').trim();

const runDdgsSearch: DdgSearchImpl = async ({ query, page, maxResults }) => {
  let lastError: Error | undefined;

  for (const candidate of PYTHON_CANDIDATES) {
    if (!candidate) {
      continue;
    }

    try {
      const stdout = await new Promise<string>((resolve, reject) => {
        execFile(
          candidate,
          ['-c', DDGS_QUERY_SCRIPT, query, String(page), String(maxResults)],
          {
            windowsHide: true,
            timeout: DEFAULT_DDGS_TIMEOUT_MS,
            maxBuffer: DEFAULT_MAX_BUFFER
          },
          (error, stdoutText, stderrText) => {
            if (error) {
              reject(
                new Error(
                  `${candidate} failed: ${stderrText.trim() || error.message}`
                )
              );
              return;
            }

            resolve(stdoutText);
          }
        );
      });

      const parsed = JSON.parse(stdout) as ProviderRawResult[];

      return parsed.map((item) => ({
        ...item,
        title: normalizeResultText(item.title),
        url: item.url.trim(),
        snippet: normalizeResultText(item.snippet)
      }));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('DDGS runtime unavailable');
};

export const createDdgAdapter = (deps: {
  fetch?: typeof fetch;
  endpoint?: string;
  searchImpl?: DdgSearchImpl;
}): SearchProviderAdapter => ({
  id: 'ddg',
  async search({ query, page, maxResults }) {
    if (deps.endpoint) {
      if (!deps.fetch) {
        throw new Error('ddg endpoint mode requires fetch support');
      }

      const url = new URL(deps.endpoint);
      url.searchParams.set('q', query);
      url.searchParams.set('page', String(page));
      url.searchParams.set('size', String(maxResults));

      const response = await deps.fetch(url);
      const payload = (await response.json()) as {
        results?: Array<{ title: string; url: string; snippet: string }>;
      };

      return (payload.results ?? []).map((item, index) => ({
        title: item.title,
        url: item.url,
        snippet: item.snippet,
        rank: (page - 1) * maxResults + index + 1,
        page
      }));
    }

    return (deps.searchImpl ?? runDdgsSearch)({
      query,
      page,
      maxResults
    });
  }
});
