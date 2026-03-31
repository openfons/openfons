import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/search-gateway/src/app';

describe('search-gateway service', () => {
  it('creates a search run and exposes provider diagnostics', async () => {
    const app = createApp({
      search: async () => ({
        searchRun: {
          id: 'search_run_001',
          projectId: 'openfons',
          purpose: 'planning' as const,
          query: 'direct api vs openrouter',
          status: 'completed' as const,
          selectedProviders: ['google'],
          degradedProviders: [],
          startedAt: '2026-03-30T08:00:00.000Z',
          finishedAt: '2026-03-30T08:00:01.000Z'
        },
        results: [],
        upgradeCandidates: [],
        diagnostics: [
          {
            providerId: 'google' as const,
            status: 'success' as const,
            degraded: false,
            reason: 'ok',
            durationMs: 100,
            resultCount: 0
          }
        ],
        downgradeInfo: []
      }),
      providerStatus: () => [
        {
          providerId: 'google' as const,
          enabled: true,
          healthy: true,
          credentialResolvedFrom: 'system' as const,
          degraded: false
        }
      ]
    });

    const createResponse = await app.request('/api/v1/search/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: 'openfons',
        purpose: 'planning',
        query: 'direct api vs openrouter',
        providers: ['google'],
        maxResults: 10,
        pages: 1,
        autoUpgrade: false
      })
    });

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.searchRun.id).toBe('search_run_001');

    const runResponse = await app.request('/api/v1/search/runs/search_run_001');
    expect(runResponse.status).toBe(200);

    const providersResponse = await app.request(
      '/api/v1/search/providers?projectId=openfons'
    );
    expect(providersResponse.status).toBe(200);
  });

  it('dispatches selected upgrade candidates asynchronously', async () => {
    const app = createApp({
      search: async () => ({
        searchRun: {
          id: 'search_run_002',
          projectId: 'openfons',
          purpose: 'evidence' as const,
          query: 'openai pricing official',
          status: 'completed' as const,
          selectedProviders: ['google'],
          degradedProviders: [],
          startedAt: '2026-03-30T08:10:00.000Z',
          finishedAt: '2026-03-30T08:10:01.000Z'
        },
        results: [],
        upgradeCandidates: [],
        diagnostics: [],
        downgradeInfo: []
      }),
      providerStatus: () => [],
      upgrade: async (searchRunId) => ({
        searchRunId,
        dispatchedCount: 1,
        skippedCount: 0,
        collectorRequests: [
          {
            searchResultId: 'search_result_001',
            action: 'http' as const,
            url: 'https://openai.com/api/pricing/'
          }
        ],
        warnings: []
      })
    });

    const createResponse = await app.request('/api/v1/search/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: 'openfons',
        purpose: 'evidence',
        query: 'openai pricing official',
        providers: ['google'],
        maxResults: 10,
        pages: 1,
        autoUpgrade: false
      })
    });

    expect(createResponse.status).toBe(201);

    const response = await app.request('/api/v1/search/runs/search_run_002/upgrade', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selectedSearchResultIds: ['search_result_001']
      })
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.dispatchedCount).toBe(1);
  });

  it('returns 404 when upgrading an unknown search run', async () => {
    const app = createApp({
      search: async () => ({
        searchRun: {
          id: 'unused',
          projectId: 'openfons',
          purpose: 'planning' as const,
          query: 'unused',
          status: 'completed' as const,
          selectedProviders: ['google'],
          degradedProviders: [],
          startedAt: '2026-03-30T08:10:00.000Z',
          finishedAt: '2026-03-30T08:10:01.000Z'
        },
        results: [],
        upgradeCandidates: [],
        diagnostics: [],
        downgradeInfo: []
      }),
      providerStatus: () => [],
      upgrade: async () => {
        throw new Error('should not be called');
      }
    });

    const response = await app.request('/api/v1/search/runs/missing/upgrade', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selectedSearchResultIds: ['search_result_001']
      })
    });

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe('Search run not found');
  });

  it('returns 400 for malformed json payloads on search run creation', async () => {
    const app = createApp({
      search: async () => {
        throw new Error('should not be called');
      },
      providerStatus: () => []
    });

    const response = await app.request('/api/v1/search/runs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: '{bad json'
    });

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Invalid JSON payload');
  });

  it('resolves provider status for the requested project id', async () => {
    const app = createApp({
      search: async () => ({
        searchRun: {
          id: 'search_run_003',
          projectId: 'openfons',
          purpose: 'planning' as const,
          query: 'noop',
          status: 'completed' as const,
          selectedProviders: ['google'],
          degradedProviders: [],
          startedAt: '2026-03-30T08:20:00.000Z',
          finishedAt: '2026-03-30T08:20:01.000Z'
        },
        results: [],
        upgradeCandidates: [],
        diagnostics: [],
        downgradeInfo: []
      }),
      providerStatus: (projectId?: string) =>
        projectId === 'another-project'
          ? [
              {
                providerId: 'bing' as const,
                enabled: true,
                healthy: true,
                credentialResolvedFrom: 'project' as const,
                degraded: false
              }
            ]
          : [
              {
                providerId: 'google' as const,
                enabled: true,
                healthy: true,
                credentialResolvedFrom: 'system' as const,
                degraded: false
              }
            ]
    });

    const response = await app.request(
      '/api/v1/search/providers?projectId=another-project'
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.projectId).toBe('another-project');
    expect(payload.providers[0].providerId).toBe('bing');
  });

  it('returns 400 for malformed json payloads on config validation', async () => {
    const app = createApp({
      search: async () => ({
        searchRun: {
          id: 'unused',
          projectId: 'openfons',
          purpose: 'planning' as const,
          query: 'unused',
          status: 'completed' as const,
          selectedProviders: ['google'],
          degradedProviders: [],
          startedAt: '2026-03-30T08:20:00.000Z',
          finishedAt: '2026-03-30T08:20:01.000Z'
        },
        results: [],
        upgradeCandidates: [],
        diagnostics: [],
        downgradeInfo: []
      }),
      providerStatus: () => []
    });

    const response = await app.request('/api/v1/search/config/validate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: '{bad json'
    });

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Invalid JSON payload');
  });
});
