import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        plugins: [tsconfigPaths({ projects: ['./tsconfig.base.json'] })],
        test: {
          name: 'node',
          setupFiles: ['./tests/setup.ts'],
          include: ['tests/**/*.test.ts'],
          environment: 'node',
          passWithNoTests: true
        }
      },
      {
        plugins: [tsconfigPaths({ projects: ['./tsconfig.base.json'] })],
        test: {
          name: 'jsdom',
          setupFiles: ['./tests/setup.ts'],
          include: ['tests/**/*.test.tsx'],
          environment: 'jsdom',
          passWithNoTests: true
        }
      }
    ]
  }
});
