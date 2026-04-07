import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

const readJson = (relativePath: string) =>
  JSON.parse(
    fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
  ) as {
    compilerOptions?: Record<string, unknown>;
  };

describe('tsconfig safety', () => {
  it('prevents the root tsconfig from emitting JS into source directories', () => {
    const rootTsconfig = readJson('tsconfig.json');

    expect(rootTsconfig.compilerOptions?.noEmit).toBe(true);
    expect(rootTsconfig.compilerOptions?.module).toBe('NodeNext');
    expect(rootTsconfig.compilerOptions?.moduleResolution).toBe('NodeNext');
  });

  it.each([
    'services/control-api/tsconfig.json',
    'services/search-gateway/tsconfig.json',
    'packages/config-center/tsconfig.json',
    'packages/domain-models/tsconfig.json',
    'packages/search-gateway/tsconfig.json'
  ])('%s is a no-emit typecheck config', (relativePath) => {
    const tsconfig = readJson(relativePath);

    expect(tsconfig.compilerOptions?.noEmit).toBe(true);
  });

  it.each([
    'services/control-api/tsconfig.build.json',
    'services/search-gateway/tsconfig.build.json',
    'packages/config-center/tsconfig.build.json',
    'packages/domain-models/tsconfig.build.json',
    'packages/search-gateway/tsconfig.build.json'
  ])('%s re-enables emit for build output', (relativePath) => {
    const tsconfig = readJson(relativePath);

    expect(tsconfig.compilerOptions?.noEmit).toBe(false);
  });
});
