import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

describe('crawler runtime doctor CLI', () => {
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
