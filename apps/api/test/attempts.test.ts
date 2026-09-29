import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { attempt, reviewItem } from '@huquq/db';
import type { AttemptBatchResult, ReviewToday } from '@huquq/core';
import { ReviewService } from '../src/review/review.service.js';
import { createTestApp, resetDb, signUp, type TestContext, type TestUser } from './helpers.js';
import { IDS, seedContent } from './fixtures.js';

interface Row {
  id?: string;
  questionId?: string;
  context?: string;
  answer?: string;
  answeredAt?: string;
  timezone?: string;
}

const row = (overrides: Row = {}): Row => ({
  id: randomUUID(),
  questionId: IDS.q1,
  context: 'quiz',
  answer: 'A',
  answeredAt: '2026-09-01T08:00:00.000Z',
  timezone: 'Asia/Baku',
  ...overrides,
});

describe('POST /v1/attempts', () => {
  let ctx: TestContext;
  let user: TestUser;

  const post = (attempts: unknown[], cookie = user.cookie) =>
    ctx.http().post('/v1/attempts').set('cookie', cookie).send({ attempts });

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.db);
    await seedContent(ctx.db);
    user = await signUp(ctx);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('requires a session', async () => {
    const res = await ctx
      .http()
      .post('/v1/attempts')
      .send({ attempts: [row()] });
    expect(res.status).toBe(401);
  });

  it('reports each row separately: accepted, duplicate and invalid', async () => {
    const first = row();
    const res = await post([
      first,
      { ...first }, // same id in the same batch
      row({ timezone: 'Mars/Base' }),
      row({ questionId: IDS.missing }),
      row({ answer: 'Z' }),
      row({ answeredAt: '2099-01-01T00:00:00Z' }),
      'not an object',
      row({ questionId: IDS.q2, answer: 'TRUE' }),
    ]);
    expect(res.status).toBe(200);
    const body = res.body as AttemptBatchResult;
    expect(body.results.map((r) => r.status)).toEqual([
      'accepted',
      'duplicate',
      'invalid',
      'invalid',
      'invalid',
      'invalid',
      'invalid',
      'accepted',
    ]);
    expect(body.results[2]?.reason).toMatch(/timezone/);
    expect(body.results[3]?.reason).toMatch(/unknown question/);
    expect(body.results[4]?.reason).toMatch(/not an option/);
    expect(body.results[5]?.reason).toMatch(/future/);
    expect(body.results[6]).toMatchObject({ index: 6, id: null });
    expect(body.summary).toEqual({ accepted: 2, duplicate: 1, invalid: 5 });
  });

  it('is idempotent: retrying a batch stores nothing twice', async () => {
    const batch = [row(), row({ questionId: IDS.q2, answer: 'false' })];
    const first = await post(batch);
    expect((first.body as AttemptBatchResult).summary.accepted).toBe(2);

    const retry = await post(batch);
    expect((retry.body as AttemptBatchResult).results.map((r) => r.status)).toEqual([
      'duplicate',
      'duplicate',
    ]);
    const [stored] = await ctx.db
      .select({ n: sql<number>`count(*)::int` })
      .from(attempt)
      .where(eq(attempt.userId, user.id));
    expect(stored?.n).toBe(2);
  });

  it('grades on the server and computes the study day in the client timezone', async () => {
    const lateEvening = row({ answer: 'B', answeredAt: '2026-09-01T19:59:59.000Z' });
    const afterMidnight = row({
      questionId: IDS.q2,
      answer: 'true',
      answeredAt: '2026-09-01T20:00:00.000Z',
    });
    await post([lateEvening, afterMidnight]);

    const stored = await ctx.db.select().from(attempt).where(eq(attempt.userId, user.id));
    const byId = new Map(stored.map((a) => [a.id, a]));
    expect(byId.get(lateEvening.id ?? '')).toMatchObject({
      isCorrect: true,
      studyDay: '2026-09-01',
    });
    expect(byId.get(afterMidnight.id ?? '')).toMatchObject({
      isCorrect: true,
      studyDay: '2026-09-02',
    });
  });

  it('rejects a malformed envelope as a whole', async () => {
    const res = await ctx
      .http()
      .post('/v1/attempts')
      .set('cookie', user.cookie)
      .send({ attempts: [] });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects malformed JSON with the error envelope', async () => {
    const res = await ctx
      .http()
      .post('/v1/attempts')
      .set('cookie', user.cookie)
      .set('content-type', 'application/json')
      .send('{"attempts": [');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'BAD_REQUEST' });
  });

  describe('review queue', () => {
    const reviewItemFor = async (questionId: string) => {
      const [item] = await ctx.db
        .select()
        .from(reviewItem)
        .where(and(eq(reviewItem.userId, user.id), eq(reviewItem.questionId, questionId)));
      return item;
    };

    it('a wrong answer adds the question; correct-only questions stay out', async () => {
      await post([row({ answer: 'A' }), row({ questionId: IDS.q2, answer: 'true' })]);
      expect(await reviewItemFor(IDS.q1)).toMatchObject({
        step: 0,
        dueDay: '2026-09-02',
        wrongCount: 1,
      });
      expect(await reviewItemFor(IDS.q2)).toBeUndefined();
    });

    it('only the first attempt of the study day moves the ladder', async () => {
      await post([
        row({ answer: 'A', answeredAt: '2026-09-01T08:00:00Z' }),
        row({ answer: 'B', answeredAt: '2026-09-01T09:00:00Z' }),
      ]);
      expect(await reviewItemFor(IDS.q1)).toMatchObject({ step: 0, correctStreak: 0 });

      await post([row({ answer: 'B', answeredAt: '2026-09-02T08:00:00Z' })]);
      expect(await reviewItemFor(IDS.q1)).toMatchObject({ step: 1, dueDay: '2026-09-05' });
    });

    it('walks to mastery across batches, then leaves the queue', async () => {
      // Dates must be in the past: answers from the future are rejected.
      const days = ['2026-08-02', '2026-08-05', '2026-08-12', '2026-09-11'];
      await post([row({ answer: 'A', answeredAt: '2026-08-01T08:00:00Z' })]);
      for (const day of days) {
        await post([row({ context: 'review', answer: 'B', answeredAt: `${day}T08:00:00Z` })]);
      }
      const item = await reviewItemFor(IDS.q1);
      expect(item?.masteredAt).toEqual(new Date('2026-09-11T08:00:00Z'));
      expect(item?.correctStreak).toBe(4);

      const res = await ctx.http().get('/v1/review/today').set('cookie', user.cookie);
      expect((res.body as ReviewToday).totalDue).toBe(0);
    });

    it('rebuilds correctly when an offline attempt arrives late', async () => {
      await post([row({ answer: 'A', answeredAt: '2026-09-01T08:00:00Z' })]);
      await post([row({ answer: 'B', answeredAt: '2026-09-05T08:00:00Z' })]); // step 1, due 09-08
      // An earlier wrong answer from another device arrives afterwards.
      await post([row({ answer: 'A', answeredAt: '2026-09-03T08:00:00Z' })]);
      // Replayed in answer order: wrong 09-01, wrong 09-03 (due 09-04), correct 09-05 → step 1.
      expect(await reviewItemFor(IDS.q1)).toMatchObject({
        step: 1,
        dueDay: '2026-09-08',
        wrongCount: 2,
      });
    });

    it('rejects UPDATEs to attempts at the database level', async () => {
      await post([row()]);
      await expect(
        ctx.db.update(attempt).set({ isCorrect: true }).where(eq(attempt.userId, user.id)),
      ).rejects.toThrow();
    });

    it('GET /v1/review/today groups due items by field with upcoming counts', async () => {
      await post([
        row({ answer: 'A', answeredAt: '2026-09-01T08:00:00Z' }),
        row({ questionId: IDS.q3, answer: 'false', answeredAt: '2026-09-01T08:00:00Z' }),
        row({ questionId: IDS.q2, answer: 'false', answeredAt: '2026-09-03T08:00:00Z' }),
      ]);
      const review = ctx.app.get(ReviewService);
      const today = await review.today(user.id, 'Asia/Baku', new Date('2026-09-02T10:00:00Z'));
      expect(today).toMatchObject({ today: '2026-09-02', timezone: 'Asia/Baku', totalDue: 2 });
      expect(today.groups.map((g) => [g.field.name, g.count])).toEqual([
        ['Cinayət hüququ', 1],
        ['Əmək hüququ', 1],
      ]);
      expect(today.upcoming[0]).toEqual({ day: '2026-09-03', count: 0 });
      expect(today.upcoming[1]).toEqual({ day: '2026-09-04', count: 1 });

      const res = await ctx.http().get('/v1/review/today').set('cookie', user.cookie);
      expect(res.status).toBe(200);
      const body = res.body as ReviewToday;
      expect(body.timezone).toBe('Asia/Baku');
      expect(body.totalDue).toBe(3); // by the real "today" all three are due
      expect(body.groups[0]?.items[0]).toMatchObject({ questionId: IDS.q1, step: 0 });
    });
  });
});
