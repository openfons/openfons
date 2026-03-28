import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dockerignorePath = resolve(__dirname, '..', '..', '.dockerignore');

describe('.dockerignore', () => {
  it('exists and excludes sensitive or bulky local artifacts from build context', () => {
    expect(existsSync(dockerignorePath)).toBe(true);

    const entries = readFileSync(dockerignorePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    expect(entries).toContain('Memory/');
    expect(entries).toContain('labs/');
    expect(entries).toContain('accounts.db');
  });
});
