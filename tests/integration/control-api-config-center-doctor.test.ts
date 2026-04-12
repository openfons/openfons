import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app.js';

const cloneRepoFixture = () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-doctor-http-'));
  const secretRoot = mkdtempSync(
    path.join(os.tmpdir(), 'openfons-doctor-http-secrets-')
  );
  cpSync(path.join(process.cwd(), 'config'), path.join(repoRoot, 'config'), {
    recursive: true
  });
  const projectDir = path.join(secretRoot, 'project', 'openfons');
  mkdirSync(projectDir, { recursive: true });
  writeFileSync(path.join(projectDir, 'google-api-key'), 'google-key');
  writeFileSync(path.join(projectDir, 'google-cx'), 'google-cx');
  writeFileSync(path.join(projectDir, 'pinchtab-token'), 'pinchtab-token');
  writeFileSync(
    path.join(projectDir, 'tiktok-cookie-main'),
    '.tiktok.com\tTRUE\t/\tFALSE\t2147483647\tms_token\tabc'
  );
  writeFileSync(
    path.join(projectDir, 'tiktok-account-main.json'),
    JSON.stringify({ username: 'collector-bot', password: 'secret' })
  );
  writeFileSync(
    path.join(projectDir, 'global-proxy-pool.json'),
    JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
  );
  return { repoRoot, secretRoot };
};

describe('control-api config-center doctor route', () => {
  it('returns the operator-facing doctor report', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const app = createApp({
      configCenter: { repoRoot, secretRoot }
    });

    const response = await app.request('/api/v1/config/projects/openfons/doctor');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      projectId: 'openfons'
    });
    expect(body.bindingRevision.etag.startsWith('sha256:')).toBe(true);
    expect(body.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ routeKey: 'youtube' }),
        expect.objectContaining({ routeKey: 'tiktok' })
      ])
    );
  });

  it('returns structured not-found for missing project doctor requests', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const app = createApp({
      configCenter: { repoRoot, secretRoot }
    });

    const missing = await app.request('/api/v1/config/projects/missing/doctor');

    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      error: 'not-found',
      resource: 'project-binding',
      projectId: 'missing',
      retryable: false
    });
  });
});
