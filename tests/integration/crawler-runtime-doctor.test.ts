import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

describe('crawler runtime doctor CLI', () => {
  it('returns zero exit for ready Hacker News reports and prints JSON', async () => {
    vi.resetModules();
    const exitHandler = vi.fn();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { runDoctorCommand } = await import(
      '../../scripts/workbench/doctor-crawler-runtime.ts'
    );

    const result = await runDoctorCommand({
      args: ['--route', 'hacker-news'],
      exitHandler,
      commandExists: () => false
    });

    expect(result.status).toBe('ready');
    expect(exitHandler).toHaveBeenCalledWith(0);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('returns non-zero exit for blocked reports and prints JSON', async () => {
    vi.resetModules();
    const exitHandler = vi.fn();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { runDoctorCommand } = await import(
      '../../scripts/workbench/doctor-crawler-runtime.ts'
    );

    const result = await runDoctorCommand({
      args: [
        '--route',
        'youtube',
        '--secret-root',
        mkdtempSync(path.join(os.tmpdir(), 'openfons-doctor-'))
      ],
      exitHandler,
      commandExists: () => false
    });

    expect(result.status).toBe('blocked');
    expect(exitHandler).toHaveBeenCalledWith(1);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
