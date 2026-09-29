/**
 * Import questions from a JSON or CSV file.
 *
 *   pnpm --filter api import:questions <file> [--dry-run]
 *
 * Every row is validated with the zod schema from @huquq/core and linked to its
 * topic (fieldSlug/topicSlug) and law articles (code:number[@version]). Invalid
 * rows are reported and skipped; valid rows are upserted in one transaction.
 * Exits 1 only on fatal errors (unreadable file, database down).
 */
import path from 'node:path';
import { createDb } from '@huquq/db';
import { loadDotEnv } from '../common/env.js';
import { importQuestions, type ImportReport } from './lib/question-importer.js';
import { readImportFile } from './lib/read-import-file.js';

function printReport(file: string, report: ImportReport, dryRun: boolean): void {
  console.log(`\n${dryRun ? '[dry run] ' : ''}Import report for ${file}`);
  console.log(`  rows:     ${report.total}`);
  console.log(`  inserted: ${report.inserted}`);
  console.log(`  updated:  ${report.updated}`);
  console.log(`  invalid:  ${report.invalid.length}`);
  for (const { row, issues } of report.invalid) {
    console.log(`  - row ${row}: ${issues.join('; ')}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const dryRun = args.includes('--dry-run');
  const file = args.find((arg) => !arg.startsWith('--'));
  if (!file) {
    console.error('Usage: pnpm --filter api import:questions <file.json|file.csv> [--dry-run]');
    process.exit(1);
  }

  loadDotEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  // pnpm --filter runs scripts from apps/api; resolve relative paths from where the user ran it.
  const resolved = path.resolve(process.env.INIT_CWD ?? process.cwd(), file);
  const inputs = await readImportFile(resolved);
  const { db, pool } = createDb(url, { max: 2 });
  try {
    const report = await importQuestions(db, inputs, { dryRun });
    printReport(resolved, report, dryRun);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
