import { describe, expect, it, vi } from 'vitest';
import { createSearchGateway } from '@openfons/search-gateway';

describe('search-gateway degrade handling', () => {
  it('returns search results from healthy providers and records downgrade info for the rest', async () => {
    const gateway = createSearchGateway({
      projectId: 'openfons',
      providers: {
        google: {
          id: 'google',
          search: async () => [
            {
              title: 'OpenAI API pricing',
              url: 'https://openai.com/api/pricing/',
              snippet: 'Official pricing page',
              rank: 1,
              page: 1
            }
          ]
        },
        bing: {
          id: 'bing',
          search: async () => {
            throw new Error('missing-credential');
          }
        }
      }
    });

    const result = await gateway.search({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'direct api vs openrouter',
      providers: ['google', 'bing'],
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].domain).toBe('openai.com');
    expect(result.downgradeInfo[0].providerId).toBe('bing');
    expect(result.upgradeCandidates[0].proposedSourceKind).toBe('official');
  });

  it('uses request projectId for policy resolution and run metadata', async () => {
    const resolvePolicy = vi.fn(() => ({
      providers: ['google' as const],
      allowDomains: ['openai.com'],
      denyDomains: []
    }));

    const gateway = createSearchGateway({
      projectId: 'openfons',
      providers: {
        google: {
          id: 'google',
          search: async () => [
            {
              title: 'OpenAI API pricing',
              url: 'https://openai.com/api/pricing/',
              snippet: 'Official pricing page',
              rank: 1,
              page: 1
            }
          ]
        }
      },
      resolvePolicy
    } as any);

    const result = await gateway.search({
      projectId: 'another-project',
      purpose: 'planning',
      query: 'openai pricing official',
      providers: ['google'],
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    expect(resolvePolicy).toHaveBeenCalledWith({
      projectId: 'another-project',
      purpose: 'planning'
    });
    expect(result.searchRun.projectId).toBe('another-project');
  });

  it('does not leak run state across independent gateway instances by default', async () => {
    const gatewayA = createSearchGateway({
      projectId: 'openfons',
      providers: {
        google: {
          id: 'google',
          search: async () => [
            {
              title: 'OpenAI API pricing',
              url: 'https://openai.com/api/pricing/',
              snippet: 'Official pricing page',
              rank: 1,
              page: 1
            }
          ]
        }
      }
    });
    const gatewayB = createSearchGateway({
      projectId: 'openfons',
      providers: {
        google: {
          id: 'google',
          search: async () => []
        }
      }
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

    expect(dispatch.dispatchedCount).toBe(0);
  });
});
