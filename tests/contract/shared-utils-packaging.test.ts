import { execFileSync, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
describe('@openfons/shared package exports', () => {
  it('resolves to built dist output in node runtime', () => {
    const buildCommand =
      process.platform === 'win32'
        ? 'pnpm --filter @openfons/shared build'
        : 'pnpm --filter @openfons/shared build';
    execSync(buildCommand, { cwd: repoRoot, stdio: 'pipe' });

    const script = `
      import { createId } from '@openfons/shared';
      import { createRequire } from 'node:module';
      Math.random = () => 0.5;
      const require = createRequire(import.meta.url);
      const resolved = require.resolve('@openfons/shared');
      const id = createId('opp');
      process.stdout.write(JSON.stringify({ resolved, id }));
    `;

    const output = execFileSync(
      process.execPath,
      ['--input-type=module', '--eval', script],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    const result = JSON.parse(output.trim()) as { resolved: string; id: string };

    expect(result.resolved).toMatch(
      /packages[\\/]shared[\\/]dist[\\/]index\.js$/
    );
    expect(result.id).toBe('opp_i0000000');
  });
});
