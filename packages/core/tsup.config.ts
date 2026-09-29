import { defineConfig } from 'tsup';

// Don't wipe dist/ in watch mode: the API's dev compiler reads it while tsup rebuilds.
export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: !options.watch,
  target: 'es2022',
}));
