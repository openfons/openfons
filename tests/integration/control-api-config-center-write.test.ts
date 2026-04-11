import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app.js';

const cloneRepoFixture = () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-control-write-'));
  const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-control-secrets-'));
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

describe('control-api config center write routes', () => {
  it('returns revisions on reads and supports dry-run and apply writes', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const app = createApp({ configCenter: { repoRoot, secretRoot } });

    const pluginDetail = await app.request('/api/v1/config/plugins/google-default');
    const pluginBody = await pluginDetail.json();
    expect(pluginBody.revision.etag.startsWith('sha256:')).toBe(true);

    const dryRun = await app.request(
      '/api/v1/config/plugins/google-default?dryRun=true',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: pluginBody.revision.etag,
          plugin: {
            ...pluginBody.plugin,
            config: {
              ...pluginBody.plugin.config,
              endpoint: 'https://example.com/custom'
            }
          }
        })
      }
    );

    expect(dryRun.status).toBe(200);
    expect((await dryRun.json()).status).toBe('dry-run');

    const conflict = await app.request('/api/v1/config/plugins/google-default', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: 'sha256:stale',
        plugin: pluginBody.plugin
      })
    });

    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({
      error: 'revision-conflict'
    });
  });

  it('returns structured 400 responses for invalid write payloads', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const app = createApp({ configCenter: { repoRoot, secretRoot } });

    const invalid = await app.request('/api/v1/config/plugins/google-default', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: 'sha256:stale'
      })
    });

    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      error: 'invalid-request'
    });
  });

  it('returns not-found for missing project bindings', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const app = createApp({ configCenter: { repoRoot, secretRoot } });

    const missing = await app.request('/api/v1/config/projects/missing/bindings');

    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      error: 'not-found'
    });
  });
});
