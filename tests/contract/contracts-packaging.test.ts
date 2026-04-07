import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
const tempRoot = path.join(repoRoot, '.tmp', 'vitest');
const require = createRequire(import.meta.url);
const tscCliPath = require.resolve('typescript/lib/tsc');

const tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0, tempDirs.length)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('@openfons/contracts package type exports', () => {
  it(
    'exposes SearchIntent for downstream TypeScript consumers',
    () => {
    execSync('pnpm --filter @openfons/contracts build', {
      cwd: repoRoot,
      stdio: 'pipe'
    });

    fs.mkdirSync(tempRoot, { recursive: true });

    const tempDir = fs.mkdtempSync(
      path.join(tempRoot, 'openfons-contracts-type-export-')
    );
    tempDirs.push(tempDir);

    const entryPath = path.join(tempDir, 'search-intent.mts');

    fs.writeFileSync(
      entryPath,
      [
        "import type { SearchIntent } from '@openfons/contracts';",
        '',
        "const intent: SearchIntent = 'comparison';",
        '',
        'export const resolvedIntent = intent;'
      ].join('\n')
    );

    const compileOutput = execFileSync(
      process.execPath,
      [
        tscCliPath,
        '--noEmit',
        '--pretty',
        'false',
        '--module',
        'NodeNext',
        '--moduleResolution',
        'NodeNext',
        entryPath
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

      expect(compileOutput).toBe('');
    },
    15000
  );
});
