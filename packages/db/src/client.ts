import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index';

export type Schema = typeof schema;
export type Database = NodePgDatabase<Schema>;

export interface DbHandle {
  db: Database;
  pool: pg.Pool;
}

/** Create a pooled Drizzle client. The caller owns `pool` and must `end()` it on shutdown. */
export function createDb(connectionString: string, options: { max?: number } = {}): DbHandle {
  const pool = new pg.Pool({ connectionString, max: options.max ?? 10 });
  const db = drizzle(pool, { schema, casing: 'snake_case' });
  return { db, pool };
}
