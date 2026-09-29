import { sql } from 'drizzle-orm';
import {
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import type { QuestionOption, QuestionType } from '@huquq/core';

/**
 * Text column with the ICU Azerbaijani collation, so `ORDER BY name` follows the
 * Azerbaijani alphabet (Ç after C, Ə after E, X after H, I before İ, ...).
 */
const azText = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'text COLLATE "az-x-icu"';
  },
});

export const field = pgTable('field', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: azText('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const topic = pgTable(
  'topic',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => field.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: azText('name').notNull(),
    summary: text('summary').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    unique('topic_field_slug_unique').on(t.fieldId, t.slug),
    index('topic_field_sort_idx').on(t.fieldId, t.sortOrder),
    index('topic_name_trgm_idx').using('gin', t.name.op('gin_trgm_ops')),
  ],
);

/** A versioned article of an official code (source: e-qanun.az). Rows are never edited in place. */
export const lawArticle = pgTable(
  'law_article',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Code identifier, e.g. `CM` (Cinayət Məcəlləsi). */
    code: text('code').notNull(),
    /** Article number as printed, e.g. `20`, `20.2`, `106-1`. */
    number: text('number').notNull(),
    /** Edition label, e.g. the effective date `2024-01-01`. */
    version: text('version').notNull(),
    text: text('text').notNull(),
    sourceUrl: text('source_url'),
    /** sha256 hex of `text`; the law-sync job compares it to detect changes. */
    contentHash: text('content_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('law_article_code_number_version_unique').on(t.code, t.number, t.version)],
);

export const question = pgTable(
  'question',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topic.id, { onDelete: 'cascade' }),
    type: text('type').$type<QuestionType>().notNull(),
    prompt: text('prompt').notNull(),
    options: jsonb('options').$type<QuestionOption[]>().notNull(),
    /** Option key for `single_choice`, `true` / `false` for `true_false`. */
    correctAnswer: text('correct_answer').notNull(),
    explanation: text('explanation').notNull().default(''),
    difficulty: smallint('difficulty').notNull().default(1),
  },
  (t) => [
    index('question_topic_idx').on(t.topicId),
    index('question_prompt_trgm_idx').using('gin', t.prompt.op('gin_trgm_ops')),
    check('question_type_check', sql`${t.type} in ('single_choice', 'true_false')`),
    check('question_difficulty_check', sql`${t.difficulty} between 1 and 3`),
  ],
);

export const questionArticle = pgTable(
  'question_article',
  {
    questionId: uuid('question_id')
      .notNull()
      .references(() => question.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => lawArticle.id, { onDelete: 'restrict' }),
  },
  (t) => [
    primaryKey({ columns: [t.questionId, t.articleId] }),
    index('question_article_article_idx').on(t.articleId),
  ],
);
