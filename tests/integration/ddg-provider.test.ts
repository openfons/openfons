import { afterEach, describe, expect, it, vi } from 'vitest';

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn()
}));

vi.mock('node:child_process', () => ({
  execFile: execFileMock
}));

import { createDdgAdapter } from '../../packages/search-gateway/src/providers/ddg';

describe('ddg provider runtime', () => {
  afterEach(() => {
    execFileMock.mockReset();
  });

  it('gives the bundled ddgs runtime enough time to return results', async () => {
    execFileMock.mockImplementation(
      (
        _candidate: string,
        _args: string[],
        options: { timeout?: number },
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        if ((options.timeout ?? 0) < 60000) {
          callback(new Error(`timeout too low: ${options.timeout}`), '', '');
          return;
        }

        callback(
          null,
          JSON.stringify([
            {
              title: 'Billing | Gemini API | Google AI for Developers',
              url: 'https://ai.google.dev/gemini-api/docs/billing',
              snippet: 'Official billing page',
              rank: 1,
              page: 1
            }
          ]),
          ''
        );
      }
    );

    const adapter = createDdgAdapter({});
    const results = await adapter.search({
      query: 'site:ai.google.dev gemini api pricing',
      page: 1,
      maxResults: 10
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.url).toBe('https://ai.google.dev/gemini-api/docs/billing');
  });
});
