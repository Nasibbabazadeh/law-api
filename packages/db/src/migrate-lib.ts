import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb } from './client';

/** Absolute path of the SQL migrations shipped with this package (works from src/ and dist/). */
export const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'drizzle',
);

export async function runMigrations(connectionString: string): Promise<void> {
  const { db, pool } = createDb(connectionString, { max: 1 });
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await pool.end();
  }
}
