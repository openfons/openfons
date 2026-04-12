import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app.js';

const cloneFixture = () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-backups-'));
  const secretRoot = mkdtempSync(
    path.join(os.tmpdir(), 'openfons-backups-secrets-')
  );
  cpSync(path.join(process.cwd(), 'config'), path.join(repoRoot, 'config'), {
    recursive: true
  });
  mkdirSync(path.join(repoRoot, 'artifacts'), { recursive: true });
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

describe('control-api config-center backup history', () => {
  it('lists applied backup entries and excludes dry-runs', async () => {
    const { repoRoot, secretRoot } = cloneFixture();
    const app = createApp({ configCenter: { repoRoot, secretRoot } });

    const detail = await app.request('/api/v1/config/plugins/google-default');
    const body = await detail.json();
    const bindingDetail = await app.request('/api/v1/config/projects/openfons/bindings');
    const bindingBody = await bindingDetail.json();

    await app.request('/api/v1/config/plugins/google-default?dryRun=true', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: body.revision.etag,
        plugin: body.plugin
      })
    });

    const historyBefore = await app.request(
      '/api/v1/config/backups?resourceId=google-default'
    );
    expect(historyBefore.status).toBe(200);
    expect((await historyBefore.json()).entries).toHaveLength(0);

    await app.request('/api/v1/config/plugins/google-default', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: body.revision.etag,
        plugin: {
          ...body.plugin,
          config: {
            ...body.plugin.config,
            endpoint: 'https://example.com/custom'
          }
        }
      })
    });

    await app.request('/api/v1/config/projects/openfons/bindings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        expectedRevision: bindingBody.revision.etag,
        binding: {
          ...bindingBody.binding,
          overrides: {
            ...(bindingBody.binding.overrides ?? {}),
            doctorMarker: 'v012'
          }
        }
      })
    });

    const historyAfter = await app.request('/api/v1/config/backups?projectId=openfons');
    expect(historyAfter.status).toBe(200);
    expect((await historyAfter.json()).entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resource: 'plugin-instance',
          resourceId: 'google-default'
        }),
        expect.objectContaining({
          resource: 'project-binding',
          resourceId: 'openfons'
        })
      ])
    );
  });
});
