import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { AttemptContext, BookmarkTargetType } from '@huquq/core';
import { user } from './auth';
import { question } from './content';

/**
 * Append-only log of answers; the source of truth for review, streak and stats.
 * The primary key is the client-generated UUID, so retried uploads are idempotent.
 * A trigger (see migrations) rejects UPDATE.
 */
export const attempt = pgTable(
  'attempt',
  {
    id: uuid('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => question.id, { onDelete: 'cascade' }),
    context: text('context').$type<AttemptContext>().notNull(),
    isCorrect: boolean('is_correct').notNull(),
    answer: text('answer').notNull(),
    answeredAt: timestamp('answered_at', { withTimezone: true }).notNull(),
    /** IANA timezone the client was in when answering. */
    timezone: text('timezone').notNull(),
    /** Local date of `answered_at` in `timezone`, computed by the server with @huquq/core. */
    studyDay: date('study_day', { mode: 'string' }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('attempt_user_question_answered_idx').on(t.userId, t.questionId, t.answeredAt),
    index('attempt_user_study_day_idx').on(t.userId, t.studyDay),
    check(
      'attempt_context_check',
      sql`${t.context} in ('quiz', 'drill', 'exam', 'review', 'group')`,
    ),
  ],
);

/**
 * Review queue state per (user, question). This is a cache rebuilt by
 * `deriveReviewItems` from `attempt` after each batch, never the source of truth.
 */
export const reviewItem = pgTable(
  'review_item',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => question.id, { onDelete: 'cascade' }),
    /** Ladder step 0..3 (intervals 1, 3, 7, 30 days). */
    step: integer('step').notNull(),
    correctStreak: integer('correct_streak').notNull(),
    dueDay: date('due_day', { mode: 'string' }).notNull(),
    masteredAt: timestamp('mastered_at', { withTimezone: true }),
    wrongCount: integer('wrong_count').notNull(),
    lastAttemptDay: date('last_attempt_day', { mode: 'string' }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.questionId] }),
    index('review_item_user_due_idx').on(t.userId, t.dueDay),
  ],
);

export const bookmark = pgTable(
  'bookmark',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    targetType: text('target_type').$type<BookmarkTargetType>().notNull(),
    targetId: uuid('target_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.targetType, t.targetId] }),
    // Widen this list when `term` bookmarks arrive.
    check('bookmark_target_type_check', sql`${t.targetType} in ('question', 'topic')`),
  ],
);
