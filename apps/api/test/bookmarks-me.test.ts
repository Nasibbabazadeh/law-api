import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { BookmarkList, Me } from '@huquq/core';
import { createTestApp, resetDb, signUp, type TestContext, type TestUser } from './helpers.js';
import { IDS, seedContent } from './fixtures.js';

describe('bookmarks', () => {
  let ctx: TestContext;
  let user: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.db);
    await seedContent(ctx.db);
    user = await signUp(ctx);
    other = await signUp(ctx);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('creates idempotently, lists per user, filters and deletes', async () => {
    const create = (targetType: string, targetId: string) =>
      ctx.http().post('/v1/bookmarks').set('cookie', user.cookie).send({ targetType, targetId });

    const first = await create('question', IDS.q1);
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ targetType: 'question', targetId: IDS.q1 });
    const again = await create('question', IDS.q1);
    expect(again.status).toBe(201);
    expect(again.body).toEqual(first.body);
    await create('topic', IDS.topicAge);

    const all = await ctx.http().get('/v1/bookmarks').set('cookie', user.cookie);
    expect((all.body as BookmarkList).items).toHaveLength(2);
    const topics = await ctx
      .http()
      .get('/v1/bookmarks?targetType=topic')
      .set('cookie', user.cookie);
    expect((topics.body as BookmarkList).items.map((b) => b.targetId)).toEqual([IDS.topicAge]);
    const others = await ctx.http().get('/v1/bookmarks').set('cookie', other.cookie);
    expect((others.body as BookmarkList).items).toEqual([]);

    const removed = await ctx
      .http()
      .delete(`/v1/bookmarks/question/${IDS.q1}`)
      .set('cookie', user.cookie);
    expect(removed.status).toBe(204);
    const removedAgain = await ctx
      .http()
      .delete(`/v1/bookmarks/question/${IDS.q1}`)
      .set('cookie', user.cookie);
    expect(removedAgain.status).toBe(404);
  });

  it('validates the target', async () => {
    const unknownType = await ctx
      .http()
      .post('/v1/bookmarks')
      .set('cookie', user.cookie)
      .send({ targetType: 'term', targetId: IDS.q1 });
    expect(unknownType.status).toBe(400);

    const missing = await ctx
      .http()
      .post('/v1/bookmarks')
      .set('cookie', user.cookie)
      .send({ targetType: 'topic', targetId: randomUUID() });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ code: 'NOT_FOUND', message: 'Mövzu tapılmadı' });
  });
});

describe('me', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.db);
    await seedContent(ctx.db);
    user = await signUp(ctx, { role: 'student', interests: ['cinayet-huququ'] });
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('returns the profile with stats and streak derived from attempts', async () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86_400_000);
    const attempts = [
      { questionId: IDS.q1, answer: 'A', answeredAt: yesterday.toISOString() },
      { questionId: IDS.q1, answer: 'B', answeredAt: today.toISOString() },
      { questionId: IDS.q3, answer: 'true', answeredAt: today.toISOString() },
    ].map((a) => ({ id: randomUUID(), context: 'quiz', timezone: 'Asia/Baku', ...a }));
    await ctx.http().post('/v1/attempts').set('cookie', user.cookie).send({ attempts });

    const res = await ctx.http().get('/v1/me').set('cookie', user.cookie);
    expect(res.status).toBe(200);
    const me = res.body as Me;
    expect(me).toMatchObject({
      id: user.id,
      role: 'student',
      interests: ['cinayet-huququ'],
      timezone: 'Asia/Baku',
      streak: { current: 2, longest: 2 },
      stats: {
        totalAttempts: 3,
        correctAttempts: 2,
        accuracy: 67,
        questionsAnswered: 2,
        topicsPracticed: 2,
        activeDays: 2,
        inReview: 1,
        mastered: 0,
      },
    });
    expect(me.stats.perField.map((f) => [f.field.slug, f.attempts, f.accuracy])).toEqual([
      ['cinayet-huququ', 2, 50],
      ['emek-huququ', 1, 100],
    ]);
  });

  it('updates interests and timezone', async () => {
    const res = await ctx
      .http()
      .patch('/v1/me')
      .set('cookie', user.cookie)
      .send({ interests: ['emek-huququ', 'aile-huququ'], timezone: 'Europe/Istanbul' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      interests: ['emek-huququ', 'aile-huququ'],
      timezone: 'Europe/Istanbul',
    });
  });

  it('rejects unknown slugs, bad timezones, empty patches and role changes', async () => {
    const patch = (body: object) =>
      ctx.http().patch('/v1/me').set('cookie', user.cookie).send(body);

    const unknownSlug = await patch({ interests: ['kosmik-huquq'] });
    expect(unknownSlug.status).toBe(400);
    expect(unknownSlug.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Naməlum sahə seçilib',
    });

    expect((await patch({ timezone: 'Baku' })).status).toBe(400);
    expect((await patch({})).status).toBe(400);
    expect((await patch({ role: 'teacher' })).status).toBe(400);
  });
});
