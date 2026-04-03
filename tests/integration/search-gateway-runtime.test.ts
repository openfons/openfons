import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRuntimeGateway } from '../../services/search-gateway/src/config';
import { createMemoryStore } from '../../services/search-gateway/src/store';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('search-gateway runtime wiring', () => {
  it('builds runtime adapters from environment-backed provider config', async () => {
    process.env.GOOGLE_APIKEY = 'google-key';
    process.env.GOOGLE_CX = 'google-cx';

    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        items: [
          {
            title: 'OpenAI API pricing',
            link: 'https://openai.com/api/pricing/',
            snippet: 'Official pricing page'
          }
        ]
      })
    }));

    const gateway = createRuntimeGateway({
      projectId: 'openfons',
      env: process.env,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    const result = await gateway.search({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'openai pricing official',
      providers: ['google'],
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].provider).toBe('google');
    expect(result.downgradeInfo).toEqual([]);
  });

  it('can share explicit run storage across runtime gateway instances', async () => {
    process.env.GOOGLE_APIKEY = 'google-key';
    process.env.GOOGLE_CX = 'google-cx';

    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        items: [
          {
            title: 'OpenAI API pricing',
            link: 'https://openai.com/api/pricing/',
            snippet: 'Official pricing page'
          }
        ]
      })
    }));

    const store = createMemoryStore();
    const gatewayA = createRuntimeGateway({
      projectId: 'openfons',
      env: process.env,
      fetchImpl: fetchMock as unknown as typeof fetch,
      runStore: store
    });
    const gatewayB = createRuntimeGateway({
      projectId: 'openfons',
      env: process.env,
      fetchImpl: fetchMock as unknown as typeof fetch,
      runStore: store
    });

    const result = await gatewayA.search({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'openai pricing official',
      providers: ['google'],
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    const dispatch = await gatewayB.upgradeCandidates(result.searchRun.id, {
      selectedSearchResultIds: [result.results[0].id]
    });

    expect(dispatch.dispatchedCount).toBe(1);
  });

  it('creates the default ddg runtime adapter without requiring an endpoint', async () => {
    const gateway = createRuntimeGateway({
      projectId: 'openfons',
      env: process.env,
      ddgSearchImpl: async () => [
        {
          title: 'OpenAI API pricing',
          url: 'https://openai.com/api/pricing/',
          snippet: 'Official pricing page',
          rank: 1,
          page: 1
        }
      ]
    });

    const result = await gateway.search({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'openai pricing official',
      providers: ['ddg'],
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].provider).toBe('ddg');
    expect(result.downgradeInfo).toEqual([]);
  });
});
