import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createCrawlerRoutePreflightReport,
  bootstrapCrawlerRoutePreflight
} from '../../services/control-api/src/collection/crawler-execution/preflight.js';

const createSecretRoot = () => {
  const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-preflight-'));
  mkdirSync(path.join(secretRoot, 'project', 'openfons'), { recursive: true });
  return secretRoot;
};

describe('crawler runtime preflight', () => {
  it('reports the current YouTube blocker without requiring TikTok secrets', () => {
    const secretRoot = createSecretRoot();

    const report = createCrawlerRoutePreflightReport({
      projectId: 'openfons',
      routeKey: 'youtube',
      repoRoot: process.cwd(),
      secretRoot,
      env: {},
      commandExists: () => false
    });

    expect(report.status).toBe('blocked');
    expect(report.route).toMatchObject({
      routeKey: 'youtube',
      driver: 'yt-dlp',
      mode: 'public-first'
    });
    expect(report.secretChecks.map((item) => item.key)).toEqual([
      'global-proxy-pool'
    ]);
    expect(report.secretChecks[0]).toMatchObject({
      status: 'missing',
      message: 'global-proxy-pool secret poolRef was not found'
    });
    expect(report.hostChecks.some((item) => item.key === 'yt-dlp')).toBe(true);
    expect(JSON.stringify(report)).not.toContain('tiktok-account-main');
  });

  it('reports all TikTok route secret blockers without printing secret values', () => {
    const secretRoot = createSecretRoot();

    const report = createCrawlerRoutePreflightReport({
      projectId: 'openfons',
      routeKey: 'tiktok',
      repoRoot: process.cwd(),
      secretRoot,
      env: {},
      commandExists: () => true
    });

    expect(report.status).toBe('blocked');
    expect(report.secretChecks.map((item) => item.key)).toEqual([
      'pinchtab-token',
      'tiktok-account-main',
      'tiktok-cookie-main',
      'global-proxy-pool'
    ]);
    expect(report.secretChecks.every((item) => item.status === 'missing')).toBe(
      true
    );
    expect(JSON.stringify(report)).not.toContain('not-for-repo');
  });

  it('reports TikTok host checks alongside the route secret blockers', () => {
    const secretRoot = createSecretRoot();

    const report = createCrawlerRoutePreflightReport({
      projectId: 'openfons',
      routeKey: 'tiktok',
      repoRoot: process.cwd(),
      secretRoot,
      env: {},
      commandExists: () => false,
      envUvPythonExists: () => false
    });

    expect(report.hostChecks.map((item) => item.key)).toEqual([
      'uv',
      '.env_uv-python',
      'pyproject.toml',
      'tiktok-api-bridge'
    ]);
    expect(report.hostChecks.find((item) => item.key === 'uv')).toMatchObject({
      status: 'missing'
    });
    expect(
      report.hostChecks.find((item) => item.key === '.env_uv-python')
    ).toMatchObject({
      status: 'missing'
    });
    expect(
      report.hostChecks.find((item) => item.key === 'pyproject.toml')
    ).toMatchObject({
      status: 'ok'
    });
    expect(
      report.hostChecks.find((item) => item.key === 'tiktok-api-bridge')
    ).toMatchObject({
      status: 'ok'
    });
  });

  it('keeps placeholder files blocked after bootstrap', () => {
    const secretRoot = createSecretRoot();

    const bootstrap = bootstrapCrawlerRoutePreflight({
      projectId: 'openfons',
      routeKey: 'tiktok',
      repoRoot: process.cwd(),
      secretRoot,
      env: {},
      commandExists: () => true,
      runUvSync: async () => ({ status: 'skipped', message: 'not requested' })
    });

    const report = createCrawlerRoutePreflightReport({
      projectId: 'openfons',
      routeKey: 'tiktok',
      repoRoot: process.cwd(),
      secretRoot,
      env: {},
      commandExists: () => true
    });

    expect(
      bootstrap.bootstrapActions.some((item) => item.status === 'created')
    ).toBe(true);
    expect(report.status).toBe('blocked');
    expect(report.secretChecks.map((item) => item.status)).toContain(
      'placeholder'
    );
  });

  it('marks a fully prepared YouTube route as ready when host command is available', () => {
    const secretRoot = createSecretRoot();
    const dir = path.join(secretRoot, 'project', 'openfons');
    writeFileSync(
      path.join(dir, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const report = createCrawlerRoutePreflightReport({
      projectId: 'openfons',
      routeKey: 'youtube',
      repoRoot: process.cwd(),
      secretRoot,
      env: {},
      commandExists: (command) => command === 'yt-dlp',
      envUvPythonExists: () => true
    });

    expect(report.status).toBe('ready');
    expect(report.nextSteps).toContain(
      'Run pnpm smoke:crawler-execution -- --route youtube --out docs/workbench/generated/crawler-execution-smoke-youtube.json'
    );
  });

  it('marks the Hacker News official API route as ready without secrets or host tooling', () => {
    const secretRoot = createSecretRoot();

    const report = createCrawlerRoutePreflightReport({
      projectId: 'openfons',
      routeKey: 'hacker-news',
      repoRoot: process.cwd(),
      secretRoot,
      env: {},
      commandExists: () => false
    });

    expect(report.status).toBe('ready');
    expect(report.route).toMatchObject({
      routeKey: 'hacker-news',
      driver: 'hacker-news-api',
      mode: 'public-first'
    });
    expect(report.hostChecks).toEqual([]);
    expect(report.secretChecks).toEqual([]);
    expect(report.nextSteps).toContain(
      'Run pnpm smoke:crawler-execution -- --route hacker-news --out docs/workbench/generated/crawler-execution-smoke-hacker-news.json'
    );
  });
});
