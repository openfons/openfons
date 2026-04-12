import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProjectConfigDoctorReport } from '@openfons/config-center';

const createFullSecretRoot = () => {
  const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-doctor-'));
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
  return secretRoot;
};

describe('config-center doctor', () => {
  it('aggregates validation, binding revision, and write-path readiness', () => {
    const secretRoot = createFullSecretRoot();

    const report = createProjectConfigDoctorReport({
      repoRoot: process.cwd(),
      secretRoot,
      projectId: 'openfons',
      routes: [
        {
          routeKey: 'youtube',
          status: 'ready',
          mode: 'public-first',
          reason: 'all required runtime inputs are configured'
        },
        {
          routeKey: 'tiktok',
          status: 'ready',
          mode: 'requires-auth',
          reason: 'all required runtime inputs are configured'
        }
      ]
    });

    expect(report.projectId).toBe('openfons');
    expect(report.status).toBe('ready');
    expect(report.bindingRevision.etag.startsWith('sha256:')).toBe(true);
    expect(report.writePath).toMatchObject({
      configWritable: true,
      lockDirReady: true,
      backupDirReady: true
    });
    expect(report.routes).toHaveLength(2);
  });

  it('marks write-path readiness false when required directories are occupied by files', () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-doctor-paths-'));
    const secretRoot = createFullSecretRoot();

    cpSync(path.join(process.cwd(), 'config'), path.join(repoRoot, 'config'), {
      recursive: true
    });
    mkdirSync(path.join(repoRoot, 'artifacts'), { recursive: true });
    writeFileSync(path.join(repoRoot, '.locks'), 'not-a-directory');
    writeFileSync(
      path.join(repoRoot, 'artifacts', 'config-center-backups'),
      'not-a-directory'
    );

    const report = createProjectConfigDoctorReport({
      repoRoot,
      secretRoot,
      projectId: 'openfons',
      routes: [
        {
          routeKey: 'youtube',
          status: 'ready',
          mode: 'public-first',
          reason: 'all required runtime inputs are configured'
        }
      ]
    });

    expect(report.writePath).toMatchObject({
      configWritable: true,
      lockDirReady: false,
      backupDirReady: false
    });
  });
});
