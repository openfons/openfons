import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'node',
          setupFiles: ['./tests/setup.ts'],
          include: ['tests/**/*.test.ts'],
          environment: 'node',
          passWithNoTests: true
        }
      },
      {
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
