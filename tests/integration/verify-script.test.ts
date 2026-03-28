import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(__dirname, '..', '..');
const verifyScript = resolve(repoRoot, 'scripts/check/verify.ps1');

describe('scripts/check/verify.ps1', () => {
  it('exits non-zero and does not print success when docker compose fails', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'verify-script-'));
    const fakeBin = join(sandbox, 'fake-bin');
    const markerFile = join(sandbox, 'calls.log');

    mkdirSync(fakeBin);
    writeFileSync(
      join(fakeBin, 'pnpm.cmd'),
      `@echo off\r\necho pnpm %*>>"${markerFile}"\r\nexit /b 0\r\n`,
      'utf8'
    );
    writeFileSync(
      join(fakeBin, 'docker.cmd'),
      `@echo off\r\necho docker %*>>"${markerFile}"\r\nexit /b 9\r\n`,
      'utf8'
    );

    const command = spawnSync(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', verifyScript],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          PATH: `${fakeBin};${process.env.PATH ?? ''}`
        },
        encoding: 'utf8'
      }
    );

    expect(command.status).not.toBe(0);
    expect(command.stdout).not.toContain('verification complete');
    expect(command.stderr).toBe('');

    rmSync(sandbox, { recursive: true, force: true });
  });
});
