import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createRuntimeGateway } from '../../services/search-gateway/src/config';
import { createMemoryStore } from '../../services/search-gateway/src/store';

describe('search-gateway runtime wiring', () => {
  it('builds runtime adapters from config-center-resolved provider config', async () => {
    const secretRoot = mkdtempSync(
      path.join(os.tmpdir(), 'openfons-search-runtime-')
    );
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(dir, 'google-cx'), 'google-cx');
    writeFileSync(path.join(dir, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(path.join(dir, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(dir, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'not-for-repo' })
    );
    writeFileSync(
      path.join(dir, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

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
      repoRoot: process.cwd(),
      secretRoot,
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
    expect(result.results[0].provider).toBe('google');
  });

  it('resolves search providers without requiring unrelated browser or crawler secrets', async () => {
    const secretRoot = mkdtempSync(
      path.join(os.tmpdir(), 'openfons-search-scope-')
    );
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(dir, 'google-cx'), 'google-cx');

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
      repoRoot: process.cwd(),
      secretRoot,
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
    expect(result.results[0].provider).toBe('google');
  });

  it('still supports shared run storage when gateways are created from config-center', async () => {
    const store = createMemoryStore();
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
    const secretRootA = mkdtempSync(path.join(os.tmpdir(), 'openfons-search-a-'));
    const dirA = path.join(secretRootA, 'project', 'openfons');
    mkdirSync(dirA, { recursive: true });
    writeFileSync(path.join(dirA, 'google-api-key'), 'google-key');
    writeFileSync(path.join(dirA, 'google-cx'), 'google-cx');
    writeFileSync(path.join(dirA, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(path.join(dirA, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(dirA, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'not-for-repo' })
    );
    writeFileSync(
      path.join(dirA, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const secretRootB = mkdtempSync(path.join(os.tmpdir(), 'openfons-search-b-'));
    const dirB = path.join(secretRootB, 'project', 'openfons');
    mkdirSync(dirB, { recursive: true });
    writeFileSync(path.join(dirB, 'google-api-key'), 'google-key');
    writeFileSync(path.join(dirB, 'google-cx'), 'google-cx');
    writeFileSync(path.join(dirB, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(path.join(dirB, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(dirB, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'not-for-repo' })
    );
    writeFileSync(
      path.join(dirB, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const gatewayA = createRuntimeGateway({
      projectId: 'openfons',
      repoRoot: process.cwd(),
      secretRoot: secretRootA,
      fetchImpl: fetchMock as unknown as typeof fetch,
      runStore: store
    });
    const gatewayB = createRuntimeGateway({
      projectId: 'openfons',
      repoRoot: process.cwd(),
      secretRoot: secretRootB,
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
      selectedSearchResultIds: []
    });

    expect(dispatch.searchRunId).toBe(result.searchRun.id);
  });
});
