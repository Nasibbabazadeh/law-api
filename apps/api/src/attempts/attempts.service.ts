import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  AttemptBatchEnvelopeSchema,
  AttemptInputSchema,
  answeredAtProblem,
  gradeAnswer,
  studyDay,
  type AttemptBatchResult,
  type AttemptRowResult,
} from '@huquq/core';
import { attempt, type Database } from '@huquq/db';
import { ApiException } from '../common/api-exception.js';
import { zodIssues } from '../common/zod-issues.js';
import { InjectDb } from '../db/db.module.js';
import { QuestionsService } from '../questions/questions.service.js';
import { ReviewService } from '../review/review.service.js';

type NewAttempt = typeof attempt.$inferInsert;

interface PendingRow {
  index: number;
  row: NewAttempt & { id: string };
}

function rawId(raw: unknown): string | null {
  if (typeof raw !== 'object' || raw === null || !('id' in raw)) return null;
  const { id } = raw;
  return typeof id === 'string' ? id : null;
}

@Injectable()
export class AttemptsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly questions: QuestionsService,
    private readonly review: ReviewService,
  ) {}

  /**
   * Record a batch of attempts. Each row is validated on its own and reported as
   * accepted, duplicate (already stored: retries are safe) or invalid. The server
   * grades every answer and computes its study day; then the review cache for the
   * touched questions is rebuilt from the full attempt log in the same transaction.
   */
  async submit(userId: string, body: unknown, now = new Date()): Promise<AttemptBatchResult> {
    const envelope = AttemptBatchEnvelopeSchema.safeParse(body);
    if (!envelope.success) {
      throw ApiException.validation(
        'Göndərilən cavablar yanlış formatdadır',
        zodIssues(envelope.error),
      );
    }

    const results: AttemptRowResult[] = [];
    const candidates: { index: number; input: ReturnType<typeof AttemptInputSchema.parse> }[] = [];
    const seenIds = new Set<string>();

    envelope.data.attempts.forEach((raw, index) => {
      const parsed = AttemptInputSchema.safeParse(raw);
      if (!parsed.success) {
        const reason = zodIssues(parsed.error)
          .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
          .join('; ');
        results[index] = { index, id: rawId(raw), status: 'invalid', reason };
        return;
      }
      const id = parsed.data.id.toLowerCase();
      if (seenIds.has(id)) {
        results[index] = { index, id, status: 'duplicate' };
        return;
      }
      seenIds.add(id);
      candidates.push({ index, input: { ...parsed.data, id } });
    });

    const questions = await this.questions.findByIds([
      ...new Set(candidates.map((c) => c.input.questionId)),
    ]);

    const pending: PendingRow[] = [];
    for (const { index, input } of candidates) {
      const invalid = (reason: string) => {
        results[index] = { index, id: input.id, status: 'invalid', reason };
      };
      const question = questions.get(input.questionId);
      if (!question) {
        invalid('questionId: unknown question');
        continue;
      }
      const answeredAt = new Date(input.answeredAt);
      const timing = answeredAtProblem(answeredAt, now);
      if (timing) {
        invalid(`answeredAt: ${timing}`);
        continue;
      }
      const grade = gradeAnswer(question, input.answer);
      if (!grade.valid) {
        invalid(`answer: ${grade.reason}`);
        continue;
      }
      pending.push({
        index,
        row: {
          id: input.id,
          userId,
          questionId: input.questionId,
          context: input.context,
          isCorrect: grade.isCorrect,
          answer: input.answer,
          answeredAt,
          timezone: input.timezone,
          studyDay: studyDay(answeredAt, input.timezone),
        },
      });
    }

    if (pending.length > 0) {
      await this.db.transaction(async (tx) => {
        // Serialise batches of the same user so each review rebuild sees every attempt.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);

        const inserted = await tx
          .insert(attempt)
          .values(pending.map((p) => p.row))
          .onConflictDoNothing({ target: attempt.id })
          .returning({ id: attempt.id, questionId: attempt.questionId });
        const insertedIds = new Set(inserted.map((row) => row.id));

        for (const { index, row } of pending) {
          results[index] = {
            index,
            id: row.id,
            status: insertedIds.has(row.id) ? 'accepted' : 'duplicate',
          };
        }

        await this.review.rebuild(
          tx,
          userId,
          inserted.map((row) => row.questionId),
        );
      });
    }

    const summary = { accepted: 0, duplicate: 0, invalid: 0 };
    for (const result of results) summary[result.status]++;
    return { results, summary };
  }
}
