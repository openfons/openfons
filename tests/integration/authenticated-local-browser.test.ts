import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CapturePlan } from '../../services/control-api/src/collection/capture-runner.js';
import {
  AUTHENTICATED_LOCAL_BROWSER_MINIMAL_FILE_STRUCTURE,
  nextAuthenticatedLocalBrowserState,
  planAuthenticatedLocalBrowserCapture,
  resolveSiteProfile
} from '../../services/control-api/src/collection/authenticated-local-browser/index.js';
import { resolveConfiguredBrowserRuntime } from '../../services/control-api/src/collection/authenticated-local-browser/runtime.js';

const createPlan = (overrides: Partial<CapturePlan> = {}): CapturePlan => ({
  topicRunId: 'run_001',
  title: 'Target page',
  url: 'https://openai.com/api/pricing/',
  snippet: 'Official page',
  sourceKind: 'official',
  useAs: 'primary',
  reportability: 'reportable',
  riskLevel: 'low',
  captureType: 'pricing-page',
  language: 'en',
  region: 'global',
  ...overrides
});

describe('authenticated local-browser collector planning', () => {
  it('matches host aliases to a site profile', () => {
    const profile = resolveSiteProfile('https://twitter.com/openai/status/1');

    expect(profile?.id).toBe('x');
  });

  it('routes browser-first sites away from the authenticated local-browser planner', () => {
    const decision = planAuthenticatedLocalBrowserCapture(
      createPlan({
        title: 'TikTok creator page',
        url: 'https://www.tiktok.com/@openai'
      })
    );

    expect(decision).toEqual({
      action: 'skip',
      reason: 'requires-public-browser'
    });
  });

  it('requests authenticated local-browser capture when the site profile requires a logged-in session', () => {
    const decision = planAuthenticatedLocalBrowserCapture(
      createPlan({
        title: 'Xiaohongshu note',
        url: 'https://www.xiaohongshu.com/explore/123456'
      })
    );

    expect(decision).toMatchObject({
      action: 'request'
    });

    if (decision.action !== 'request') {
      throw new Error('expected a local-browser request');
    }

    expect(decision.request.siteProfile.id).toBe('xiaohongshu');
    expect(decision.request.requiresAuthenticatedSession).toBe(true);
    expect(decision.request.reason).toBe('needs_authenticated_capture');
    expect(decision.request.requiredArtifacts).toEqual(
      expect.arrayContaining(['page-dom', 'screenshot', 'interaction-log', 'session-note'])
    );
  });

  it('requests authenticated local-browser capture when policy already escalated to authenticated capture', () => {
    const decision = planAuthenticatedLocalBrowserCapture(
      createPlan({
        title: 'Reddit thread',
        url: 'https://www.reddit.com/r/OpenAI/comments/abc123/example/'
      }),
      {
        policyCode: 'needs_authenticated_capture'
      }
    );

    expect(decision).toMatchObject({
      action: 'request'
    });

    if (decision.action !== 'request') {
      throw new Error('expected a local-browser request');
    }

    expect(decision.request.requiresAuthenticatedSession).toBe(true);
    expect(decision.request.reason).toBe('needs_authenticated_capture');
  });

  it('keeps public documentation pages on the existing public path', () => {
    const decision = planAuthenticatedLocalBrowserCapture(createPlan({
      title: 'WeChat article',
      url: 'https://mp.weixin.qq.com/s/example'
    }));

    expect(decision).toEqual({
      action: 'skip',
      reason: 'public-path-sufficient'
    });
  });

  it('documents the bootstrap file structure for the collector slice', () => {
    expect(AUTHENTICATED_LOCAL_BROWSER_MINIMAL_FILE_STRUCTURE).toEqual(
      expect.arrayContaining([
        'services/control-api/src/collection/authenticated-local-browser/index.ts',
        'services/local-browser-bridge/',
        'config/site-profiles/'
      ])
    );
  });
});

describe('authenticated local-browser state machine', () => {
  it('advances through the operator-owned capture lifecycle', () => {
    let state = nextAuthenticatedLocalBrowserState('planned', 'queue');
    state = nextAuthenticatedLocalBrowserState(state, 'operator-approved');
    state = nextAuthenticatedLocalBrowserState(state, 'browser-launched');
    state = nextAuthenticatedLocalBrowserState(state, 'navigation-started');
    state = nextAuthenticatedLocalBrowserState(state, 'page-loaded');
    state = nextAuthenticatedLocalBrowserState(state, 'capture-succeeded');

    expect(state).toBe('captured');
  });

  it('rejects impossible transitions', () => {
    expect(() =>
      nextAuthenticatedLocalBrowserState('planned', 'capture-succeeded')
    ).toThrow('invalid local-browser transition');
  });
});

describe('authenticated local-browser configured runtime', () => {
  it('resolves the configured browser runtime for the tiktok route', () => {
    const secretRoot = mkdtempSync(
      path.join(os.tmpdir(), 'openfons-browser-runtime-')
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

    const runtime = resolveConfiguredBrowserRuntime({
      projectId: 'openfons',
      routeKey: 'tiktok',
      repoRoot: process.cwd(),
      secretRoot
    });

    expect(runtime.pluginId).toBe('pinchtab-local');
    expect(runtime.driver).toBe('pinchtab');
    expect(runtime.secrets.tokenRef.configured).toBe(true);
  });

  it('resolves browser runtime without requiring unrelated search or crawler secrets', () => {
    const secretRoot = mkdtempSync(
      path.join(os.tmpdir(), 'openfons-browser-scope-')
    );
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'pinchtab-token'), 'pinchtab-token');

    const runtime = resolveConfiguredBrowserRuntime({
      projectId: 'openfons',
      routeKey: 'tiktok',
      repoRoot: process.cwd(),
      secretRoot
    });

    expect(runtime.pluginId).toBe('pinchtab-local');
    expect(runtime.driver).toBe('pinchtab');
    expect(runtime.secrets.tokenRef.configured).toBe(true);
  });
});
