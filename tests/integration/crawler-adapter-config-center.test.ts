import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildConfiguredCrawlerAdapter,
  createConfiguredCrawlerRegistry,
  resolveCrawlerRouteKeyForUrl
} from '../../services/control-api/src/collection/crawler-adapters/registry.js';

describe('crawler adapters from config center', () => {
  it('builds route-aware adapters for youtube, tiktok, and hacker-news', () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-crawlers-'));
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(dir, 'google-cx'), 'google-cx');
    writeFileSync(path.join(dir, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(dir, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'secret' })
    );
    writeFileSync(path.join(dir, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(
      path.join(dir, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const registry = createConfiguredCrawlerRegistry({
      projectId: 'openfons',
      repoRoot: process.cwd(),
      secretRoot
    });

    const youtube = registry.get('youtube');
    const tiktok = registry.get('tiktok');
    const hackerNews = registry.get('hacker-news');

    expect(youtube?.driver).toBe('yt-dlp');
    expect(youtube?.requiresAuth).toBe(false);
    expect(tiktok?.driver).toBe('tiktok-api');
    expect(tiktok?.requiresAuth).toBe(true);
    expect(tiktok?.browserRuntime?.pluginId).toBe('pinchtab-local');
    expect(hackerNews?.driver).toBe('hacker-news-api');
    expect(hackerNews?.requiresAuth).toBe(false);
  });

  it('resolves a requested route without requiring unrelated crawler secrets', () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-crawlers-scope-'));
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const registry = createConfiguredCrawlerRegistry({
      projectId: 'openfons',
      repoRoot: process.cwd(),
      secretRoot
    });

    expect(registry.get('youtube')?.driver).toBe('yt-dlp');
  });

  it('maps url aliases to configured route keys instead of assuming routeKey equals siteProfile id', () => {
    expect(
      resolveCrawlerRouteKeyForUrl({
        routeKeys: ['twitter'],
        url: 'https://x.com/openfons/status/1'
      })
    ).toBe('twitter');

    expect(
      resolveCrawlerRouteKeyForUrl({
        routeKeys: ['youtube'],
        url: 'https://youtu.be/demo123'
      })
    ).toBe('youtube');

    expect(
      resolveCrawlerRouteKeyForUrl({
        routeKeys: ['hacker-news'],
        url: 'https://news.ycombinator.com/item?id=8863'
      })
    ).toBe('hacker-news');
  });

  it('maps non-openfons drivers from resolved route runtime instead of hardcoded route ids', () => {
    expect(
      buildConfiguredCrawlerAdapter({
        routeKey: 'twitter',
        mode: 'requires-auth',
        collection: {
          pluginId: 'twitter-adapter',
          driver: 'twscrape',
          type: 'crawler-adapter',
          config: {},
          secrets: {}
        },
        browser: undefined,
        accounts: [
          {
            pluginId: 'twitter-account-main',
            driver: 'credentials-file',
            type: 'account-source',
            config: {},
            secrets: {}
          }
        ],
        cookies: [],
        proxy: {
          pluginId: 'global-proxy-pool',
          driver: 'static-proxy-file',
          type: 'proxy-source',
          config: {},
          secrets: {}
        }
      }).driver
    ).toBe('twscrape');

    expect(
      buildConfiguredCrawlerAdapter({
        routeKey: 'reddit',
        mode: 'requires-auth',
        collection: {
          pluginId: 'reddit-adapter',
          driver: 'praw',
          type: 'crawler-adapter',
          config: {},
          secrets: {}
        },
        browser: undefined,
        accounts: [
          {
            pluginId: 'reddit-account-main',
            driver: 'credentials-file',
            type: 'account-source',
            config: {},
            secrets: {}
          }
        ],
        cookies: [],
        proxy: undefined
      }).driver
    ).toBe('praw');

    expect(
      buildConfiguredCrawlerAdapter({
        routeKey: 'hacker-news',
        mode: 'public-first',
        collection: {
          pluginId: 'hacker-news-adapter',
          driver: 'hacker-news-api',
          type: 'crawler-adapter',
          config: {},
          secrets: {}
        },
        browser: undefined,
        accounts: [],
        cookies: [],
        proxy: undefined
      }).driver
    ).toBe('hacker-news-api');

    expect(
      buildConfiguredCrawlerAdapter({
        routeKey: 'xiaohongshu',
        mode: 'requires-auth',
        collection: {
          pluginId: 'media-crawler-adapter',
          driver: 'media-crawler',
          type: 'crawler-adapter',
          config: {},
          secrets: {}
        },
        browser: {
          pluginId: 'pinchtab-local',
          driver: 'pinchtab',
          type: 'browser-runtime',
          config: {},
          secrets: {}
        },
        accounts: [
          {
            pluginId: 'xiaohongshu-account-main',
            driver: 'credentials-file',
            type: 'account-source',
            config: {},
            secrets: {}
          }
        ],
        cookies: [
          {
            pluginId: 'xiaohongshu-cookie-main',
            driver: 'netscape-cookie-file',
            type: 'cookie-source',
            config: {},
            secrets: {}
          }
        ],
        proxy: {
          pluginId: 'global-proxy-pool',
          driver: 'static-proxy-file',
          type: 'proxy-source',
          config: {},
          secrets: {}
        }
      }).enabled
    ).toBe(false);
  });
});
