import { mkdtempSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createRuntimeGateway } from '../../services/search-gateway/src/config';

describe('search-gateway runtime readiness wiring', () => {
  it('returns blocked omissions instead of crashing when a configured provider is missing secrets', async () => {
    const secretRoot = mkdtempSync(
      path.join(os.tmpdir(), 'openfons-runtime-readiness-')
    );
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });

    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        results: [
          {
            title: 'OpenAI API pricing',
            url: 'https://openai.com/api/pricing/',
            snippet: 'Official pricing page'
          }
        ]
      })
    }));

    const gateway = createRuntimeGateway({
      projectId: 'openfons',
      repoRoot: process.cwd(),
      secretRoot,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    const result = await gateway.search({
      projectId: 'openfons',
      purpose: 'planning',
      query: 'openai pricing official',
      providers: ['google', 'ddg'],
      maxResults: 10,
      pages: 1,
      autoUpgrade: false
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      result.retrievalPlan?.omissions.some(
        (item) => item.routeKey === 'google' && item.status === 'blocked'
      )
    ).toBe(true);
    expect(result.retrievalOutcome?.selectedRoute).toBe('ddg');
  });
});
