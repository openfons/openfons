import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadConfigCenterState,
  resolveMaskedProjectRuntimeConfig,
  resolveProjectRuntimeConfig,
  validateProjectConfig
} from '@openfons/config-center';

describe('config-center resolver', () => {
  it('returns raw runtime for backend use and masked runtime for management APIs', () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-resolver-'));
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

    const state = loadConfigCenterState({ repoRoot: process.cwd(), secretRoot });
    const validation = validateProjectConfig({ state, projectId: 'openfons' });
    const rawRuntime = resolveProjectRuntimeConfig({ state, projectId: 'openfons' });
    const maskedRuntime = resolveMaskedProjectRuntimeConfig({
      state,
      projectId: 'openfons'
    });

    expect(validation.status).toBe('valid');
    expect(rawRuntime.routes.tiktok.browser?.secrets.tokenRef.value).toBe('pinchtab-token');
    expect(maskedRuntime.routes.tiktok.browser?.secrets.tokenRef.summary).toContain(
      'pinchtab-token'
    );
    expect(JSON.stringify(maskedRuntime)).not.toContain('not-for-repo');
  });
});
