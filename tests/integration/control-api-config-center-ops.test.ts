import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app.js';

const cloneRepoFixture = () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-config-ops-'));
  const secretRoot = mkdtempSync(
    path.join(os.tmpdir(), 'openfons-config-ops-secrets-')
  );
  cpSync(path.join(process.cwd(), 'config'), path.join(repoRoot, 'config'), {
    recursive: true
  });
  const projectSecretDir = path.join(secretRoot, 'project', 'openfons');
  mkdirSync(projectSecretDir, { recursive: true });
  writeFileSync(path.join(projectSecretDir, 'google-api-key'), 'google-key');
  writeFileSync(path.join(projectSecretDir, 'google-cx'), 'google-cx');
  writeFileSync(path.join(projectSecretDir, 'pinchtab-token'), 'pinchtab-token');
  writeFileSync(path.join(projectSecretDir, 'tiktok-cookie-main'), 'sessionid=abc');
  writeFileSync(
    path.join(projectSecretDir, 'tiktok-account-main.json'),
    JSON.stringify({ username: 'collector-bot', password: 'secret' })
  );
  writeFileSync(
    path.join(projectSecretDir, 'global-proxy-pool.json'),
    JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
  );
  return { repoRoot, secretRoot };
};

describe('control-api config-center operator errors', () => {
  it('returns structured not-found bodies for missing project validation', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const app = createApp({
      configCenter: { repoRoot, secretRoot }
    });

    const missing = await app.request('/api/v1/config/projects/missing/validate', {
      method: 'POST'
    });

    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      error: 'not-found',
      resource: 'project-binding',
      projectId: 'missing',
      retryable: false
    });
  });

  it('returns structured revision-conflict bodies for stale plugin writes', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const app = createApp({
      configCenter: { repoRoot, secretRoot }
    });

    const conflict = await app.request('/api/v1/config/plugins/google-default', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: 'sha256:stale',
        plugin: {
          id: 'google-default',
          type: 'search-provider',
          driver: 'google',
          enabled: true,
          scope: 'global',
          config: {
            endpoint: 'https://customsearch.googleapis.com/customsearch/v1'
          },
          secrets: {
            apiKeyRef: {
              scheme: 'secret',
              scope: 'project',
              projectId: 'openfons',
              name: 'google-api-key'
            },
            cxRef: {
              scheme: 'secret',
              scope: 'project',
              projectId: 'openfons',
              name: 'google-cx'
            }
          },
          dependencies: [],
          policy: {}
        }
      })
    });

    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({
      error: 'revision-conflict',
      resource: 'plugin-instance',
      resourceId: 'google-default',
      projectId: 'openfons',
      retryable: true
    });
  });
});
