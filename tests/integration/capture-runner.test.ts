import { describe, expect, it, vi } from 'vitest';
import type { CollectionLog } from '@openfons/contracts';
import {
  createCaptureRunner,
  type CapturePlan,
  type CaptureRunner
} from '../../services/control-api/src/collection/capture-runner.js';

type ExtendedCaptureRunnerFactory = (deps: {
  fetchImpl?: typeof fetch;
  runCurl?: (url: string) => Promise<string>;
  browserDumpDom?: (url: string) => Promise<string>;
}) => CaptureRunner;

const createPlan = (overrides: Partial<CapturePlan> = {}): CapturePlan => ({
  topicRunId: 'run_001',
  title: 'OpenAI API pricing',
  url: 'https://openai.com/api/pricing/',
  snippet: 'Official pricing page',
  sourceKind: 'official',
  useAs: 'primary',
  reportability: 'reportable',
  riskLevel: 'low',
  captureType: 'pricing-page',
  language: 'en',
  region: 'global',
  ...overrides
});

const getMessages = (logs: CollectionLog[]) => logs.map((log) => log.message);

describe('capture runner real-world fallbacks', () => {
  it('uses the openai rsc fallback when the html page is blocked', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === 'https://openai.com/api/pricing/') {
        return new Response('<html>blocked</html>', {
          status: 403,
          headers: {
            'content-type': 'text/html'
          }
        });
      }

      if (url === 'https://openai.com/api/pricing/?_rsc=openfons') {
        return new Response(
          'pricing calculator OpenAI API pricing input output token rates',
          {
            status: 200,
            headers: {
              'content-type': 'text/x-component'
            }
          }
        );
      }

      throw new Error(`unexpected url: ${url}`);
    });

    const runner = (createCaptureRunner as unknown as ExtendedCaptureRunnerFactory)({
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    const result = await runner([createPlan()]);

    expect(result.sourceCaptures[0].summary).toContain('pricing calculator');
    expect(getMessages(result.collectionLogs)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('openai-rsc fallback')
      ])
    );
  });

  it('uses curl fallback for help center pages when direct fetch is blocked', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('fetch failed');
    });
    const runCurl = vi.fn(async () =>
      '<html><body><article><p>OpenAI API supported countries and territories</p></article></body></html>'
    );

    const runner = (createCaptureRunner as unknown as ExtendedCaptureRunnerFactory)({
      fetchImpl: fetchMock as unknown as typeof fetch,
      runCurl
    });

    const result = await runner([
      createPlan({
        title: 'OpenAI supported countries',
        url: 'https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories',
        captureType: 'availability-page'
      })
    ]);

    expect(runCurl).toHaveBeenCalledWith(
      'https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories'
    );
    expect(result.sourceCaptures[0].summary).toContain(
      'OpenAI API supported countries and territories'
    );
    expect(getMessages(result.collectionLogs)).toEqual(
      expect.arrayContaining([expect.stringContaining('curl fallback')])
    );
  });

  it('uses browser dom fallback for help center pages when curl fails on Windows TLS', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('fetch failed');
    });
    const runCurl = vi.fn(async () => {
      throw new Error('schannel: failed to receive handshake');
    });
    const browserDumpDom = vi.fn(async () =>
      '<html><body><article><p>OpenAI API supported countries and territories</p></article></body></html>'
    );

    const runner = (createCaptureRunner as unknown as ExtendedCaptureRunnerFactory)({
      fetchImpl: fetchMock as unknown as typeof fetch,
      runCurl,
      browserDumpDom
    });

    const result = await runner([
      createPlan({
        title: 'OpenAI supported countries',
        url: 'https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories',
        captureType: 'availability-page'
      })
    ]);

    expect(runCurl).toHaveBeenCalledWith(
      'https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories'
    );
    expect(browserDumpDom).toHaveBeenCalledWith(
      'https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories'
    );
    expect(result.sourceCaptures[0].summary).toContain(
      'OpenAI API supported countries and territories'
    );
    expect(getMessages(result.collectionLogs)).toEqual(
      expect.arrayContaining([expect.stringContaining('browser-dom fallback')])
    );
  });

  it('uses browser dom fallback for Gemini docs pages when fetch cannot resolve them', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const browserDumpDom = vi.fn(async () =>
      '<html><body><main><h1>Gemini Developer API pricing</h1><p>Pricing tables and paid tier details.</p></main></body></html>'
    );

    const runner = (createCaptureRunner as unknown as ExtendedCaptureRunnerFactory)({
      fetchImpl: fetchMock as unknown as typeof fetch,
      browserDumpDom
    });

    const result = await runner([
      createPlan({
        title: 'Gemini Developer API pricing',
        url: 'https://ai.google.dev/gemini-api/docs/pricing'
      })
    ]);

    expect(browserDumpDom).toHaveBeenCalledWith(
      'https://ai.google.dev/gemini-api/docs/pricing'
    );
    expect(result.sourceCaptures[0].summary).toContain(
      'Gemini Developer API pricing'
    );
    expect(getMessages(result.collectionLogs)).toEqual(
      expect.arrayContaining([expect.stringContaining('browser-dom fallback')])
    );
  });

  it('retries OpenAI help pages over http before falling back to curl', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('<html><body>Please wait while we verify you</body></html>', {
          status: 403,
          headers: {
            'content-type': 'text/html'
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          '<html><body><article><h1>OpenAI API - Supported Countries and Territories</h1><p>List of countries we support.</p></article></body></html>',
          {
            status: 200,
            headers: {
              'content-type': 'text/html'
            }
          }
        )
      );
    const runCurl = vi.fn(async () => {
      throw new Error('curl should not be used');
    });

    const runner = (createCaptureRunner as unknown as ExtendedCaptureRunnerFactory)({
      fetchImpl: fetchMock as unknown as typeof fetch,
      runCurl
    });

    const result = await runner([
      createPlan({
        title: 'OpenAI supported countries',
        url: 'https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories',
        captureType: 'availability-page'
      })
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(runCurl).not.toHaveBeenCalled();
    expect(result.sourceCaptures[0].summary).toContain(
      'OpenAI API - Supported Countries and Territories'
    );
  });
});
