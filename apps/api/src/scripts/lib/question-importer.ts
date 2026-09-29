import { eq, inArray, sql } from 'drizzle-orm';
import { QuestionImportRowSchema, type QuestionImportRow, type ArticleRef } from '@huquq/core';
import { field, lawArticle, question, questionArticle, topic, type Database } from '@huquq/db';
import { zodIssues } from '../../common/zod-issues.js';

export interface ImportInput {
  /** Row number as the author sees it (1-based JSON index, or CSV line number). */
  row: number;
  data: unknown;
}

export interface InvalidRow {
  row: number;
  issues: string[];
}

export interface ImportReport {
  total: number;
  inserted: number;
  updated: number;
  invalid: InvalidRow[];
}

interface ResolvedRow {
  row: number;
  data: QuestionImportRow;
  topicId: string;
  articleIds: string[];
}

const naturalOrder = new Intl.Collator('en', { numeric: true });

function articleLabel(ref: ArticleRef): string {
  return `${ref.code}:${ref.number}${ref.version ? `@${ref.version}` : ''}`;
}

/**
 * Validate question rows with the core zod schema, resolve their topic and law
 * articles, and upsert every valid row in one transaction. Invalid rows are
 * reported, never thrown. With `dryRun` nothing is written.
 */
export async function importQuestions(
  db: Database,
  inputs: readonly ImportInput[],
  options: { dryRun?: boolean } = {},
): Promise<ImportReport> {
  const invalid: InvalidRow[] = [];
  const parsed: { row: number; data: QuestionImportRow }[] = [];
  const seenIds = new Set<string>();

  for (const input of inputs) {
    const result = QuestionImportRowSchema.safeParse(input.data);
    if (!result.success) {
      invalid.push({
        row: input.row,
        issues: zodIssues(result.error).map((i) =>
          i.path ? `${i.path}: ${i.message}` : i.message,
        ),
      });
      continue;
    }
    if (result.data.id) {
      if (seenIds.has(result.data.id)) {
        invalid.push({
          row: input.row,
          issues: [`id: duplicate id ${result.data.id} in this file`],
        });
        continue;
      }
      seenIds.add(result.data.id);
    }
    parsed.push({ row: input.row, data: result.data });
  }

  // Resolve topics by "fieldSlug/topicSlug".
  const topicRows = await db
    .select({ id: topic.id, slug: topic.slug, fieldSlug: field.slug })
    .from(topic)
    .innerJoin(field, eq(field.id, topic.fieldId));
  const topicByKey = new Map(topicRows.map((t) => [`${t.fieldSlug}/${t.slug}`, t.id]));

  // Resolve articles; without a version the latest (highest version label) wins.
  const codes = [...new Set(parsed.flatMap((p) => p.data.articles.map((a) => a.code)))];
  const articleRows =
    codes.length > 0
      ? await db
          .select({
            id: lawArticle.id,
            code: lawArticle.code,
            number: lawArticle.number,
            version: lawArticle.version,
          })
          .from(lawArticle)
          .where(inArray(lawArticle.code, codes))
      : [];
  const findArticle = (ref: ArticleRef): string | undefined => {
    const matches = articleRows.filter(
      (a) =>
        a.code === ref.code &&
        a.number === ref.number &&
        (!ref.version || a.version === ref.version),
    );
    matches.sort((a, b) => naturalOrder.compare(b.version, a.version));
    return matches[0]?.id;
  };

  const resolved: ResolvedRow[] = [];
  for (const { row, data } of parsed) {
    const issues: string[] = [];
    const topicId = topicByKey.get(`${data.fieldSlug}/${data.topicSlug}`);
    if (!topicId) issues.push(`topicSlug: unknown topic ${data.fieldSlug}/${data.topicSlug}`);
    const articleIds: string[] = [];
    for (const ref of data.articles) {
      const id = findArticle(ref);
      if (id) articleIds.push(id);
      else issues.push(`articles: unknown law article ${articleLabel(ref)}`);
    }
    if (issues.length > 0 || !topicId) {
      invalid.push({ row, issues });
      continue;
    }
    resolved.push({ row, data, topicId, articleIds: [...new Set(articleIds)] });
  }

  let inserted = 0;
  let updated = 0;
  if (!options.dryRun && resolved.length > 0) {
    await db.transaction(async (tx) => {
      for (const { data, topicId, articleIds } of resolved) {
        const values = {
          topicId,
          type: data.type,
          prompt: data.prompt,
          options: data.options,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation,
          difficulty: data.difficulty,
        };
        const [saved] = await tx
          .insert(question)
          .values({ ...values, ...(data.id ? { id: data.id } : {}) })
          .onConflictDoUpdate({ target: question.id, set: values })
          .returning({ id: question.id, created: sql<boolean>`(xmax = 0)` });
        if (!saved) throw new Error('Question upsert returned no row');
        if (saved.created) inserted++;
        else updated++;

        await tx.delete(questionArticle).where(eq(questionArticle.questionId, saved.id));
        if (articleIds.length > 0) {
          await tx
            .insert(questionArticle)
            .values(articleIds.map((articleId) => ({ questionId: saved.id, articleId })));
        }
      }
    });
  }

  invalid.sort((a, b) => a.row - b.row);
  return { total: inputs.length, inserted, updated, invalid };
}
