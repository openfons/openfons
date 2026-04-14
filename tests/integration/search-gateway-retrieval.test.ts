import { describe, expect, it, vi } from 'vitest';
import { createSearchGateway } from '@openfons/search-gateway';

describe('search-gateway retrieval orchestration', () => {
  it('reports no selected providers when readiness blocks every route before execution', async () => {
    const googleSearch = vi.fn(async () => [
      {
        title: 'Google result should not be used',
        url: 'https://example.com/google-should-not-run',
        snippet: 'blocked route should be skipped',
        rank: 1,
        page: 1
      }
    ]);

    const gateway = createSearchGateway({
      projectId: 'openfons',
      providers: {
        google: {
          id: 'google',
          search: googleSearch
        }
      },
      resolvePolicy: () => ({
        providers: ['google'],
        allowDomains: ['openai.com'],
        denyDomains: []
      }),
      resolveSourceReadiness: () => ({
        sourceId: 'search',
        status: 'blocked',
        routes: [
          {
            sourceId: 'search',
            routeKey: 'google',
            status: 'blocked',
            qualityTier: 'primary',
            requirements: [],
            blockers: [
              {
                code: 'missing_secret_value',
                message: 'google-default secret apiKeyRef was not found'
              }
            ],
            warnings: [],
            detail: { pluginId: 'google-default' }
          }
        ],
        summary: 'google is blocked',
        updatedAt: '2026-04-13T18:40:00.000Z'
      })
    });

    const result = await gateway.search({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'openai pricing official',
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    expect(googleSearch).not.toHaveBeenCalled();
    expect(result.searchRun.selectedProviders).toEqual([]);
    expect(result.retrievalOutcome).toMatchObject({
      sourceId: 'search',
      status: 'blocked'
    });
    expect(result.retrievalOutcome?.attempts).toHaveLength(0);
  });

  it('builds retrieval plan and outcome from readiness while skipping blocked routes', async () => {
    const googleSearch = vi.fn(async () => [
      {
        title: 'Google result should not be used',
        url: 'https://example.com/google-should-not-run',
        snippet: 'blocked route should be skipped',
        rank: 1,
        page: 1
      }
    ]);
    const ddgSearch = vi.fn(async () => [
      {
        title: 'OpenAI API pricing',
        url: 'https://openai.com/api/pricing/',
        snippet: 'Official pricing page',
        rank: 1,
        page: 1
      }
    ]);

    const gateway = createSearchGateway({
      projectId: 'openfons',
      providers: {
        google: {
          id: 'google',
          search: googleSearch
        },
        ddg: {
          id: 'ddg',
          search: ddgSearch
        }
      },
      resolvePolicy: () => ({
        providers: ['google', 'ddg'],
        allowDomains: ['openai.com'],
        denyDomains: []
      }),
      resolveSourceReadiness: () => ({
        sourceId: 'search',
        status: 'ready',
        routes: [
          {
            sourceId: 'search',
            routeKey: 'google',
            status: 'blocked',
            qualityTier: 'primary',
            requirements: [],
            blockers: [
              {
                code: 'missing_secret_value',
                message: 'google-default secret apiKeyRef was not found'
              }
            ],
            warnings: [],
            detail: { pluginId: 'google-default' }
          },
          {
            sourceId: 'search',
            routeKey: 'ddg',
            status: 'ready',
            qualityTier: 'fallback',
            requirements: [],
            blockers: [],
            warnings: [],
            detail: { pluginId: 'ddg-default' }
          }
        ],
        summary: 'google is blocked and ddg is ready',
        updatedAt: '2026-04-13T18:40:00.000Z'
      })
    });

    const result = await gateway.search({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'openai pricing official',
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    expect(googleSearch).not.toHaveBeenCalled();
    expect(ddgSearch).toHaveBeenCalledTimes(1);
    expect(result.retrievalPlan).toMatchObject({
      sourceId: 'search',
      candidates: [
        {
          routeKey: 'ddg',
          qualityTier: 'fallback',
          status: 'ready'
        }
      ],
      omissions: [
        {
          routeKey: 'google',
          status: 'blocked'
        }
      ]
    });
    expect(result.retrievalOutcome).toMatchObject({
      sourceId: 'search',
      selectedRoute: 'ddg',
      status: 'succeeded'
    });
    expect(result.searchRun.selectedProviders).toEqual(['ddg']);
    expect(result.retrievalOutcome?.attempts).toHaveLength(1);
  });

  it('marks the retrieval outcome partial when a primary route fails before fallback succeeds', async () => {
    const googleSearch = vi.fn(async () => {
      throw new Error('rate-limited');
    });
    const ddgSearch = vi.fn(async () => [
      {
        title: 'OpenAI API pricing',
        url: 'https://openai.com/api/pricing/',
        snippet: 'Official pricing page',
        rank: 1,
        page: 1
      }
    ]);

    const gateway = createSearchGateway({
      projectId: 'openfons',
      providers: {
        google: {
          id: 'google',
          search: googleSearch
        },
        ddg: {
          id: 'ddg',
          search: ddgSearch
        }
      },
      resolvePolicy: () => ({
        providers: ['google', 'ddg'],
        allowDomains: ['openai.com'],
        denyDomains: []
      }),
      resolveSourceReadiness: () => ({
        sourceId: 'search',
        status: 'ready',
        routes: [
          {
            sourceId: 'search',
            routeKey: 'google',
            status: 'ready',
            qualityTier: 'primary',
            requirements: [],
            blockers: [],
            warnings: [],
            detail: { pluginId: 'google-default' }
          },
          {
            sourceId: 'search',
            routeKey: 'ddg',
            status: 'ready',
            qualityTier: 'fallback',
            requirements: [],
            blockers: [],
            warnings: [],
            detail: { pluginId: 'ddg-default' }
          }
        ],
        summary: 'google primary with ddg fallback',
        updatedAt: '2026-04-13T18:40:00.000Z'
      })
    });

    const result = await gateway.search({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'openai pricing official',
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    expect(googleSearch).toHaveBeenCalledTimes(1);
    expect(ddgSearch).toHaveBeenCalledTimes(1);
    expect(result.retrievalOutcome).toMatchObject({
      sourceId: 'search',
      selectedRoute: 'ddg',
      status: 'partial'
    });
    expect(result.searchRun.selectedProviders).toEqual(['google', 'ddg']);
    expect(result.retrievalOutcome?.attempts).toHaveLength(2);
  });
});
