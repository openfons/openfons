import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildProjectReadiness } from '@openfons/config-center';

const cloneRepoFixture = () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-readiness-'));
  const secretRoot = mkdtempSync(
    path.join(os.tmpdir(), 'openfons-readiness-secrets-')
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

describe('@openfons/config-center project readiness', () => {
  it('builds search and crawler readiness from repo config plus local secrets', () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();

    const report = buildProjectReadiness({
      repoRoot,
      secretRoot,
      projectId: 'openfons'
    });

    expect(report.projectId).toBe('openfons');
    expect(
      report.sources.find((source) => source.sourceId === 'search')
    ).toMatchObject({
      status: 'ready'
    });
    expect(
      report.sources.find((source) => source.sourceId === 'tiktok')?.routes[0]
    ).toMatchObject({
      routeKey: 'tiktok',
      status: 'blocked'
    });
  });

  it('marks a source degraded when only fallback search routes remain ready', () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-readiness-fallback-'));
    const secretRoot = mkdtempSync(
      path.join(os.tmpdir(), 'openfons-readiness-fallback-secrets-')
    );

    cpSync(path.join(process.cwd(), 'config'), path.join(repoRoot, 'config'), {
      recursive: true
    });
    mkdirSync(path.join(secretRoot, 'project', 'openfons'), { recursive: true });

    const report = buildProjectReadiness({
      repoRoot,
      secretRoot,
      projectId: 'openfons'
    });
    const search = report.sources.find((source) => source.sourceId === 'search');

    expect(search).toMatchObject({
      status: 'degraded'
    });
    expect(search?.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          routeKey: 'google',
          status: 'blocked',
          qualityTier: 'primary'
        }),
        expect.objectContaining({
          routeKey: 'ddg',
          status: 'ready',
          qualityTier: 'fallback'
        })
      ])
    );
  });
});
