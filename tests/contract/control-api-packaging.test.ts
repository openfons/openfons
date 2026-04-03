import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

describe('@openfons/control-api workspace dependencies', () => {
  it('resolves @openfons/search-gateway from the control-api package runtime', () => {
    execSync('pnpm --filter @openfons/shared build', {
      cwd: repoRoot,
      stdio: 'pipe'
    });

    execSync('pnpm --filter @openfons/contracts build', {
      cwd: repoRoot,
      stdio: 'pipe'
    });

    execSync('pnpm --filter @openfons/search-gateway build', {
      cwd: repoRoot,
      stdio: 'pipe'
    });

    const script = [
      "import { createRequire } from 'node:module';",
      'const require = createRequire(import.meta.url);',
      "const resolved = require.resolve('@openfons/search-gateway');",
      "const gateway = await import('@openfons/search-gateway');",
      'process.stdout.write(JSON.stringify({',
      '  resolved,',
      '  exportedKeys: Object.keys(gateway).sort()',
      '}));'
    ].join(' ');

    const output = execSync(
      `pnpm --filter @openfons/control-api exec node --input-type=module --eval ${JSON.stringify(
        script
      )}`,
      {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      }
    );

    const result = JSON.parse(output.trim()) as {
      resolved: string;
      exportedKeys: string[];
    };

    expect(result.resolved).toMatch(
      /packages[\\/]search-gateway[\\/]dist[\\/]index\.js$/
    );
    expect(result.exportedKeys).toContain('createSearchGateway');
  });
});
