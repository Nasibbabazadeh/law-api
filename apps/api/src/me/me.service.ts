import { Injectable } from '@nestjs/common';
import { and, count, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import {
  computeStats,
  computeStreak,
  studyDay,
  type Me,
  type MePatch,
  UserRoleSchema,
} from '@huquq/core';
import { attempt, field, question, reviewItem, topic, user, type Database } from '@huquq/db';
import { ApiException } from '../common/api-exception.js';
import { InjectDb } from '../db/db.module.js';

@Injectable()
export class MeService {
  constructor(@InjectDb() private readonly db: Database) {}

  async get(userId: string, now = new Date()): Promise<Me> {
    const [profile] = await this.db.select().from(user).where(eq(user.id, userId));
    if (!profile) throw ApiException.notFound('İstifadəçi tapılmadı');

    const today = studyDay(now, profile.timezone);
    const attempts = await this.db
      .select({
        questionId: attempt.questionId,
        isCorrect: attempt.isCorrect,
        studyDay: attempt.studyDay,
        topicId: question.topicId,
        fieldId: topic.fieldId,
      })
      .from(attempt)
      .innerJoin(question, eq(question.id, attempt.questionId))
      .innerJoin(topic, eq(topic.id, question.topicId))
      .where(eq(attempt.userId, userId));

    const stats = computeStats(attempts);
    const streak = computeStreak(
      attempts.map((a) => a.studyDay),
      today,
    );

    const fieldIds = stats.perField.map((f) => f.fieldId);
    const fields =
      fieldIds.length > 0
        ? await this.db
            .select({ id: field.id, slug: field.slug, name: field.name })
            .from(field)
            .where(inArray(field.id, fieldIds))
        : [];
    const fieldById = new Map(fields.map((f) => [f.id, f]));

    const [inReview] = await this.db
      .select({ value: count() })
      .from(reviewItem)
      .where(and(eq(reviewItem.userId, userId), isNull(reviewItem.masteredAt)));
    const [mastered] = await this.db
      .select({ value: count() })
      .from(reviewItem)
      .where(and(eq(reviewItem.userId, userId), isNotNull(reviewItem.masteredAt)));

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      emailVerified: profile.emailVerified,
      image: profile.image,
      role: UserRoleSchema.parse(profile.role),
      interests: profile.interests,
      locale: profile.locale,
      timezone: profile.timezone,
      createdAt: profile.createdAt.toISOString(),
      today,
      streak,
      stats: {
        totalAttempts: stats.totalAttempts,
        correctAttempts: stats.correctAttempts,
        accuracy: stats.accuracy,
        questionsAnswered: stats.questionsAnswered,
        topicsPracticed: stats.topicsPracticed,
        activeDays: stats.activeDays,
        inReview: inReview?.value ?? 0,
        mastered: mastered?.value ?? 0,
        perField: stats.perField.flatMap((f) => {
          const ref = fieldById.get(f.fieldId);
          return ref
            ? [{ field: ref, attempts: f.attempts, correct: f.correct, accuracy: f.accuracy }]
            : [];
        }),
      },
    };
  }

  async update(userId: string, patch: MePatch): Promise<Me> {
    if (patch.interests && patch.interests.length > 0) {
      const known = await this.db
        .select({ slug: field.slug })
        .from(field)
        .where(inArray(field.slug, patch.interests));
      const knownSlugs = new Set(known.map((f) => f.slug));
      const unknown = patch.interests.filter((slug) => !knownSlugs.has(slug));
      if (unknown.length > 0) {
        throw ApiException.validation('Naməlum sahə seçilib', [
          { path: 'interests', message: `Unknown field slugs: ${unknown.join(', ')}` },
        ]);
      }
    }
    await this.db
      .update(user)
      .set({
        ...(patch.interests !== undefined ? { interests: patch.interests } : {}),
        ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));
    return this.get(userId);
  }
}
