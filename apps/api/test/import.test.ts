import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { field, question, questionArticle } from '@huquq/db';
import { importQuestions } from '../src/scripts/lib/question-importer.js';
import { readImportFile } from '../src/scripts/lib/read-import-file.js';
import { seed } from '../src/scripts/seed.js';
import { createTestApp, resetDb, type TestContext } from './helpers.js';

const examples = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../examples');

describe('seed and question import', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.db);
    await seed(ctx.db);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('seeds the Azerbaijani dev content idempotently', async () => {
    await seed(ctx.db);
    expect(await ctx.db.select().from(field)).toHaveLength(6);
    expect(await ctx.db.select().from(question)).toHaveLength(5);

    const res = await ctx.http().get('/v1/fields');
    expect((res.body as { items: { name: string }[] }).items.map((f) => f.name)).toEqual([
      'Ailə hüququ',
      'Cinayət hüququ',
      'Əmək hüququ',
      'İnzibati hüquq',
      'Konstitusiya hüququ',
      'Mülki hüquq',
    ]);
  });

  it('imports the example CSV and JSON files and links articles', async () => {
    const csv = await importQuestions(
      ctx.db,
      await readImportFile(`${examples}/questions.example.csv`),
    );
    expect(csv).toMatchObject({ total: 2, inserted: 2, updated: 0, invalid: [] });
    const json = await importQuestions(
      ctx.db,
      await readImportFile(`${examples}/questions.example.json`),
    );
    expect(json).toMatchObject({ total: 1, inserted: 1, invalid: [] });

    const links = await ctx.db
      .select()
      .from(questionArticle)
      .where(eq(questionArticle.questionId, 'd1000000-0000-4000-8000-000000000201'));
    expect(links).toHaveLength(1);
  });

  it('updates rows with an id on re-import instead of duplicating them', async () => {
    const inputs = await readImportFile(`${examples}/questions.example.json`);
    await importQuestions(ctx.db, inputs);
    const again = await importQuestions(ctx.db, inputs);
    expect(again).toMatchObject({ inserted: 0, updated: 1 });
  });

  it('reports invalid rows with their row numbers and imports the rest', async () => {
    const valid = {
      fieldSlug: 'cinayet-huququ',
      topicSlug: 'cinayet-mesuliyyeti-yasi',
      type: 'true_false',
      prompt: 'Etibarlı sual mətni.',
      correctAnswer: 'true',
      articles: [{ code: 'CM', number: '20' }],
    };
    const report = await importQuestions(ctx.db, [
      { row: 1, data: valid },
      { row: 2, data: { ...valid, topicSlug: 'yoxdur' } },
      { row: 3, data: { ...valid, articles: [{ code: 'CM', number: '999' }] } },
      {
        row: 4,
        data: { ...valid, articles: [{ code: 'CM', number: '20', version: '1999-01-01' }] },
      },
      { row: 5, data: { ...valid, type: 'essay' } },
      { row: 6, data: 'not an object' },
    ]);
    expect(report.inserted).toBe(1);
    expect(report.invalid.map((r) => r.row)).toEqual([2, 3, 4, 5, 6]);
    expect(report.invalid[0]?.issues[0]).toMatch(/unknown topic/);
    expect(report.invalid[1]?.issues[0]).toMatch(/unknown law article CM:999/);
    expect(report.invalid[2]?.issues[0]).toMatch(/CM:20@1999-01-01/);
  });

  it('writes nothing in a dry run', async () => {
    const report = await importQuestions(
      ctx.db,
      await readImportFile(`${examples}/questions.example.csv`),
      { dryRun: true },
    );
    expect(report).toMatchObject({ inserted: 0, updated: 0, invalid: [] });
    expect(await ctx.db.select().from(question)).toHaveLength(5);
  });
});
