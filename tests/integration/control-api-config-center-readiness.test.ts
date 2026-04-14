import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app.js';

const cloneRepoFixture = () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-readiness-http-'));
  const secretRoot = mkdtempSync(
    path.join(os.tmpdir(), 'openfons-readiness-http-secrets-')
  );

  cpSync(path.join(process.cwd(), 'config'), path.join(repoRoot, 'config'), {
    recursive: true
  });

  const projectDir = path.join(secretRoot, 'project', 'openfons');
  mkdirSync(projectDir, { recursive: true });
  writeFileSync(path.join(projectDir, 'google-api-key'), 'google-key');
  writeFileSync(path.join(projectDir, 'google-cx'), 'google-cx');

  return { repoRoot, secretRoot };
};

describe('control-api config-center readiness route', () => {
  it('returns the operator-facing project readiness report', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const app = createApp({
      configCenter: { repoRoot, secretRoot }
    });

    const response = await app.request('/api/v1/config/projects/openfons/readiness');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      projectId: 'openfons'
    });
    expect(
      body.sources.find((source: { sourceId: string }) => source.sourceId === 'search')
    ).toMatchObject({
      status: 'ready'
    });
    expect(
      body.sources.find((source: { sourceId: string }) => source.sourceId === 'tiktok')
    ).toMatchObject({
      status: 'blocked'
    });
  });

  it('returns structured not-found for missing project readiness requests', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const app = createApp({
      configCenter: { repoRoot, secretRoot }
    });

    const missing = await app.request('/api/v1/config/projects/missing/readiness');

    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      error: 'not-found',
      resource: 'project-binding',
      projectId: 'missing',
      retryable: false
    });
  });
});
