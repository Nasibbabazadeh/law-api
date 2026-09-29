import { runMigrations } from '@huquq/db';
import { testDatabaseUrl } from './env.js';

export default async function setup(): Promise<void> {
  await runMigrations(testDatabaseUrl());
}
