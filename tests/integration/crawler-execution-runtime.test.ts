import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createCrawlerExecutionDispatcher
} from '../../services/control-api/src/collection/crawler-execution/dispatcher.js';
import {
  resolveExecutableCrawlerRouteForUrl
} from '../../services/control-api/src/collection/crawler-execution/runtime.js';

const writeJson = (filePath: string, value: unknown) => {
  writeFileSync(filePath, JSON.stringify(value, null, 2));
};

const createConfigRepoRoot = ({
  pluginInstances,
  binding
}: {
  pluginInstances: unknown[];
  binding: unknown;
}) => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-exec-repo-'));
  const instancesDir = path.join(repoRoot, 'config', 'plugins', 'instances');
  const bindingDir = path.join(repoRoot, 'config', 'projects', 'openfons', 'plugins');

  mkdirSync(instancesDir, { recursive: true });
  mkdirSync(bindingDir, { recursive: true });

  for (const instance of pluginInstances) {
    const plugin = instance as { id: string };
    writeJson(path.join(instancesDir, `${plugin.id}.json`), plugin);
  }

  writeJson(path.join(bindingDir, 'bindings.json'), binding);

  return repoRoot;
};

describe('crawler execution runtime', () => {
  it('resolves backend-only route runtime for configured Hacker News urls', () => {
    const runtime = resolveExecutableCrawlerRouteForUrl({
      projectId: 'openfons',
      repoRoot: process.cwd(),
      url: 'https://news.ycombinator.com/item?id=8863'
    });

    expect(runtime?.routeKey).toBe('hacker-news');
    expect(runtime?.collection.driver).toBe('hacker-news-api');
    expect(runtime?.accounts).toEqual([]);
    expect(runtime?.cookies).toEqual([]);
    expect(runtime?.proxy).toBeUndefined();
  });

  it('resolves backend-only route runtime for configured tiktok target url', () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-exec-runtime-'));
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(path.join(dir, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(dir, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'secret' })
    );
    writeFileSync(
      path.join(dir, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const runtime = resolveExecutableCrawlerRouteForUrl({
      projectId: 'openfons',
      repoRoot: process.cwd(),
      secretRoot,
      url: 'https://www.tiktok.com/@openfons'
    });

    expect(runtime?.routeKey).toBe('tiktok');
    expect(runtime?.collection.driver).toBe('tiktok-api');
    expect(runtime?.cookies[0]?.secrets.sessionRef.value).toBe('sessionid=abc');
    expect(runtime?.accounts[0]?.secrets.accountRef.value).toEqual({
      username: 'collector-bot',
      password: 'secret'
    });
    expect(runtime?.proxy?.secrets.poolRef.value).toEqual([
      { endpoint: 'http://proxy.local:9000' }
    ]);
  });

  it('returns undefined when url only matches non-executable routes without collection', () => {
    const repoRoot = createConfigRepoRoot({
      pluginInstances: [],
      binding: {
        projectId: 'openfons',
        enabledPlugins: [],
        roles: {},
        routes: {
          youtube: {
            mode: 'public-first'
          }
        },
        overrides: {}
      }
    });

    const runtime = resolveExecutableCrawlerRouteForUrl({
      projectId: 'openfons',
      repoRoot,
      url: 'https://www.youtube.com/watch?v=demo'
    });

    expect(runtime).toBeUndefined();
  });

  it('rejects executable route runtime when collection plugin is not crawler-adapter', () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-exec-secret-'));
    const secretDir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(secretDir, { recursive: true });
    writeFileSync(path.join(secretDir, 'pinchtab-token'), 'pinchtab-token');

    const repoRoot = createConfigRepoRoot({
      pluginInstances: [
        {
          id: 'pinchtab-local',
          type: 'browser-runtime',
          driver: 'pinchtab',
          enabled: true,
          scope: 'project',
          config: {
            baseUrl: 'http://localhost:9222',
            allowedDomains: ['tiktok.com', 'www.tiktok.com']
          },
          secrets: {
            tokenRef: {
              scheme: 'secret',
              scope: 'project',
              projectId: 'openfons',
              name: 'pinchtab-token'
            }
          },
          dependencies: [],
          policy: {}
        }
      ],
      binding: {
        projectId: 'openfons',
        enabledPlugins: ['pinchtab-local'],
        roles: {},
        routes: {
          youtube: {
            mode: 'public-first',
            collection: 'pinchtab-local'
          }
        },
        overrides: {}
      }
    });

    expect(() =>
      resolveExecutableCrawlerRouteForUrl({
        projectId: 'openfons',
        repoRoot,
        secretRoot,
        url: 'https://www.youtube.com/watch?v=demo'
      })
    ).toThrow(
      'invalid crawler runtime for route youtube: collection plugin pinchtab-local must be type crawler-adapter, got browser-runtime'
    );
  });
});

describe('crawler execution dispatcher', () => {
  const createExecutionPlan = (
    driver: 'yt-dlp' | 'tiktok-api' | 'media-crawler' | 'hacker-news-api'
  ) => ({
    capturePlan: {
      topicRunId: 'topic_001',
      title: 'Test capture',
      url: 'https://example.com',
      snippet: 'matched',
      sourceKind: 'official' as const,
      useAs: 'primary' as const,
      reportability: 'reportable' as const,
      riskLevel: 'low' as const,
      captureType: 'doc-page' as const,
      language: 'en',
      region: 'global'
    },
    runtime: {
      routeKey: 'test',
      mode: 'public-first' as const,
      collection: {
        pluginId: `${driver}-adapter`,
        type: 'crawler-adapter' as const,
        driver,
        config: {},
        secrets: {}
      },
      browser: undefined,
      accounts: [],
      cookies: [],
      proxy: undefined
    }
  });

  it('dispatches yt-dlp plans to the yt-dlp runner', async () => {
    const expected = {
      sourceCapture: { id: 'cap_yt' },
      collectionLogs: []
    };
    const ytDlpRunner = vi.fn(async () => expected);
    const tiktokApiRunner = vi.fn();
    const dispatcher = createCrawlerExecutionDispatcher({
      ytDlpRunner,
      tiktokApiRunner
    });

    const result = await dispatcher.run(createExecutionPlan('yt-dlp'));

    expect(result).toBe(expected);
    expect(ytDlpRunner).toHaveBeenCalledOnce();
    expect(tiktokApiRunner).not.toHaveBeenCalled();
  });

  it('dispatches tiktok-api plans to the tiktok runner', async () => {
    const expected = {
      sourceCapture: { id: 'cap_tiktok' },
      collectionLogs: []
    };
    const ytDlpRunner = vi.fn();
    const tiktokApiRunner = vi.fn(async () => expected);
    const dispatcher = createCrawlerExecutionDispatcher({
      ytDlpRunner,
      tiktokApiRunner
    });

    const result = await dispatcher.run(createExecutionPlan('tiktok-api'));

    expect(result).toBe(expected);
    expect(tiktokApiRunner).toHaveBeenCalledOnce();
    expect(ytDlpRunner).not.toHaveBeenCalled();
  });

  it('dispatches hacker-news-api plans to the official API runner', async () => {
    const expected = {
      sourceCapture: { id: 'cap_hn' },
      collectionLogs: []
    };
    const ytDlpRunner = vi.fn();
    const tiktokApiRunner = vi.fn();
    const hackerNewsApiRunner = vi.fn(async () => expected);
    const dispatcher = createCrawlerExecutionDispatcher({
      ytDlpRunner,
      tiktokApiRunner,
      hackerNewsApiRunner
    } as any);

    const result = await dispatcher.run(createExecutionPlan('hacker-news-api'));

    expect(result).toBe(expected);
    expect(hackerNewsApiRunner).toHaveBeenCalledOnce();
    expect(ytDlpRunner).not.toHaveBeenCalled();
    expect(tiktokApiRunner).not.toHaveBeenCalled();
  });

  it('rejects unsupported crawler drivers explicitly', async () => {
    const dispatcher = createCrawlerExecutionDispatcher({
      ytDlpRunner: vi.fn(),
      tiktokApiRunner: vi.fn()
    });

    await expect(
      dispatcher.run(
        createExecutionPlan('media-crawler') as ReturnType<typeof createExecutionPlan>
      )
    ).rejects.toThrow(
      'crawler execution is not implemented for media-crawler'
    );
  });
});
