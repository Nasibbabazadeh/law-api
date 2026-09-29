import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import {
  azCompare,
  deriveReviewItems,
  diffDays,
  dueToday,
  studyDay,
  upcomingCounts,
  type ReviewFieldGroup,
  type ReviewToday,
} from '@huquq/core';
import {
  attempt,
  field,
  question,
  reviewItem,
  topic,
  type Database,
  type Executor,
} from '@huquq/db';
import { InjectDb } from '../db/db.module.js';

@Injectable()
export class ReviewService {
  constructor(@InjectDb() private readonly db: Database) {}

  /**
   * Recompute the review_item cache for some of a user's questions from the full
   * attempt log (the source of truth). Call inside the transaction that inserted
   * the attempts.
   */
  async rebuild(tx: Executor, userId: string, questionIds: readonly string[]): Promise<void> {
    if (questionIds.length === 0) return;
    const ids = [...new Set(questionIds)];

    const attempts = await tx
      .select({
        id: attempt.id,
        questionId: attempt.questionId,
        isCorrect: attempt.isCorrect,
        answeredAt: attempt.answeredAt,
        studyDay: attempt.studyDay,
      })
      .from(attempt)
      .where(and(eq(attempt.userId, userId), inArray(attempt.questionId, ids)));

    const items = deriveReviewItems(attempts);
    const keep = items.map((item) => item.questionId);

    // Questions whose derived state is "not in the queue at all" lose their cache row.
    await tx
      .delete(reviewItem)
      .where(
        and(
          eq(reviewItem.userId, userId),
          inArray(reviewItem.questionId, ids),
          ...(keep.length > 0 ? [notInArray(reviewItem.questionId, keep)] : []),
        ),
      );

    if (items.length === 0) return;
    const rows = items.map((item) => ({
      userId,
      questionId: item.questionId,
      step: item.step,
      correctStreak: item.correctStreak,
      dueDay: item.dueDay,
      masteredAt: item.masteredAt ? new Date(item.masteredAt) : null,
      wrongCount: item.wrongCount,
      lastAttemptDay: item.lastAttemptDay,
    }));
    await tx
      .insert(reviewItem)
      .values(rows)
      .onConflictDoUpdate({
        target: [reviewItem.userId, reviewItem.questionId],
        set: {
          step: sqlExcluded('step'),
          correctStreak: sqlExcluded('correct_streak'),
          dueDay: sqlExcluded('due_day'),
          masteredAt: sqlExcluded('mastered_at'),
          wrongCount: sqlExcluded('wrong_count'),
          lastAttemptDay: sqlExcluded('last_attempt_day'),
        },
      });
  }

  /** Questions due today (in the user's timezone), grouped by field, plus the next 7 days. */
  async today(userId: string, timezone: string, now = new Date()): Promise<ReviewToday> {
    const today = studyDay(now, timezone);

    const items = await this.db
      .select({
        questionId: reviewItem.questionId,
        step: reviewItem.step,
        correctStreak: reviewItem.correctStreak,
        dueDay: reviewItem.dueDay,
        masteredAt: reviewItem.masteredAt,
        wrongCount: reviewItem.wrongCount,
        lastAttemptDay: reviewItem.lastAttemptDay,
        topicId: topic.id,
        field: { id: field.id, slug: field.slug, name: field.name },
      })
      .from(reviewItem)
      .innerJoin(question, eq(question.id, reviewItem.questionId))
      .innerJoin(topic, eq(topic.id, question.topicId))
      .innerJoin(field, eq(field.id, topic.fieldId))
      .where(and(eq(reviewItem.userId, userId), isNull(reviewItem.masteredAt)))
      .orderBy(asc(reviewItem.dueDay), asc(reviewItem.questionId));

    const groups = new Map<string, ReviewFieldGroup>();
    const due = dueToday(items, today);
    for (const item of due) {
      const group = groups.get(item.field.id) ?? { field: item.field, count: 0, items: [] };
      group.items.push({
        questionId: item.questionId,
        topicId: item.topicId,
        step: item.step,
        correctStreak: item.correctStreak,
        dueDay: item.dueDay,
        overdueDays: diffDays(item.dueDay, today),
        wrongCount: item.wrongCount,
        lastAttemptDay: item.lastAttemptDay,
      });
      group.count++;
      groups.set(item.field.id, group);
    }

    return {
      today,
      timezone,
      totalDue: due.length,
      groups: [...groups.values()].sort((a, b) => azCompare(a.field.name, b.field.name)),
      upcoming: upcomingCounts(items, today),
    };
  }
}

/** `excluded.<column>` in an ON CONFLICT DO UPDATE clause. */
function sqlExcluded(column: string) {
  return sql.raw(`excluded."${column}"`);
}
