import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { runMigrations } from './migrate-lib';

// The repo root .env is shared by all workspaces.
config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env'),
  quiet: true,
});

const url = process.argv[2] ?? process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (pass a URL as the first argument or set it in .env).');
  process.exit(1);
}

await runMigrations(url);
console.log(`Migrations applied to ${new URL(url).pathname.slice(1)}.`);
