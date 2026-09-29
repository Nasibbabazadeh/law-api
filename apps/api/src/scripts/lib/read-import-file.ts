import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { csvRecordToImportInput } from '@huquq/core';
import type { ImportInput } from './question-importer.js';

/**
 * Read a question import file.
 * - `.json`: an array of rows, or `{ "questions": [...] }`. Row numbers are 1-based.
 * - `.csv`: header row + one question per line (see `csvRecordToImportInput`).
 *   Row numbers are file line numbers, so the header is line 1.
 */
export async function readImportFile(file: string): Promise<ImportInput[]> {
  const content = await readFile(file, 'utf8');
  const extension = path.extname(file).toLowerCase();

  if (extension === '.json') {
    const json: unknown = JSON.parse(content);
    const rows: unknown[] | null = Array.isArray(json)
      ? (json as unknown[])
      : typeof json === 'object' &&
          json !== null &&
          'questions' in json &&
          Array.isArray(json.questions)
        ? (json.questions as unknown[])
        : null;
    if (!rows)
      throw new Error('JSON import must be an array or an object with a "questions" array');
    return rows.map((data, index) => ({ row: index + 1, data }));
  }

  if (extension === '.csv') {
    const records = parse<Record<string, string>>(content, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
    return records.map((record, index) => ({
      row: index + 2,
      data: csvRecordToImportInput(record),
    }));
  }

  throw new Error(`Unsupported file type "${extension}" (use .json or .csv)`);
}
