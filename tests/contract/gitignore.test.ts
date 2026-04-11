import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const gitignorePath = resolve(__dirname, '..', '..', '.gitignore');

describe('.gitignore', () => {
  it('exists and excludes generated runtime artifacts from git tracking', () => {
    expect(existsSync(gitignorePath)).toBe(true);

    const entries = readFileSync(gitignorePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    expect(entries).toContain('artifacts/generated/');
  });
});
