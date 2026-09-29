import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// API tests run against a real Postgres (DATABASE_URL_TEST). SWC keeps decorator
// metadata, which Nest's dependency injection needs.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
