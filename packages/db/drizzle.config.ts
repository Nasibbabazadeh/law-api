import path from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/huquq',
  },
});
