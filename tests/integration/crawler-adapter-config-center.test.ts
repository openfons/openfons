import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildConfiguredCrawlerAdapter,
  createConfiguredCrawlerRegistry
} from '../../services/control-api/src/collection/crawler-adapters/registry.js';

describe('crawler adapters from config center', () => {
  it('builds route-aware adapters for youtube and tiktok', () => {
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

    expect(youtube?.driver).toBe('yt-dlp');
    expect(youtube?.requiresAuth).toBe(false);
    expect(tiktok?.driver).toBe('tiktok-api');
    expect(tiktok?.requiresAuth).toBe(true);
    expect(tiktok?.browserRuntime?.pluginId).toBe('pinchtab-local');
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
