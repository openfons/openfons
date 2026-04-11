import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyPluginInstanceWrite,
  applyProjectBindingWrite,
  listPluginInstanceRecords
} from '@openfons/config-center';

const cloneRepoFixture = () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-config-write-'));
  const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-config-secrets-'));
  cpSync(path.join(process.cwd(), 'config'), path.join(repoRoot, 'config'), {
    recursive: true
  });
  mkdirSync(path.join(repoRoot, 'artifacts'), { recursive: true });
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

describe('config-center writes', () => {
  it('supports dry-run, apply, optimistic concurrency, and lock failures for plugin instances', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const current = listPluginInstanceRecords({ repoRoot }).find(
      (item) => item.plugin.id === 'google-default'
    )!;

    const dryRun = await applyPluginInstanceWrite({
      repoRoot,
      secretRoot,
      projectId: 'openfons',
      plugin: {
        ...current.plugin,
        config: {
          ...current.plugin.config,
          endpoint: 'https://example.com/custom'
        }
      },
      expectedRevision: current.revision.etag,
      dryRun: true
    });

    expect(dryRun.status).toBe('dry-run');
    expect(readFileSync(current.filePath, 'utf8')).toContain(
      'customsearch.googleapis.com'
    );

    const applied = await applyPluginInstanceWrite({
      repoRoot,
      secretRoot,
      projectId: 'openfons',
      plugin: {
        ...current.plugin,
        config: {
          ...current.plugin.config,
          endpoint: 'https://example.com/custom'
        }
      },
      expectedRevision: current.revision.etag,
      dryRun: false
    });

    expect(applied.status).toBe('applied');
    expect(applied.backupFile?.replaceAll('\\', '/')).toContain(
      'artifacts/config-center-backups'
    );

    await expect(
      applyPluginInstanceWrite({
        repoRoot,
        secretRoot,
        projectId: 'openfons',
        plugin: current.plugin,
        expectedRevision: current.revision.etag,
        dryRun: false
      })
    ).rejects.toThrow(/revision conflict/i);

    mkdirSync(path.join(repoRoot, '.locks'), { recursive: true });
    writeFileSync(path.join(repoRoot, '.locks', 'plugin-google-default.lock'), '');

    await expect(
      applyPluginInstanceWrite({
        repoRoot,
        secretRoot,
        projectId: 'openfons',
        plugin: current.plugin,
        dryRun: false
      })
    ).rejects.toThrow(/lock unavailable/i);
  });

  it('blocks project-binding writes that make the project invalid', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();

    await expect(
      applyProjectBindingWrite({
        repoRoot,
        secretRoot,
        projectId: 'openfons',
        binding: {
          projectId: 'openfons',
          enabledPlugins: ['google-default'],
          roles: { primarySearch: 'missing-plugin' },
          routes: {},
          overrides: {}
        },
        dryRun: false
      })
    ).rejects.toThrow(/invalid/i);
  });
});
