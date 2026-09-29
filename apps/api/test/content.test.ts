import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, resetDb, signUp, type TestContext, type TestUser } from './helpers.js';
import { IDS, seedContent } from './fixtures.js';

describe('content', () => {
  let ctx: TestContext;
  let student: TestUser;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDb(ctx.db);
    await seedContent(ctx.db);
    student = await signUp(ctx);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('lists fields in Azerbaijani alphabetical order (az-x-icu)', async () => {
    const res = await ctx.http().get('/v1/fields');
    expect(res.status).toBe(200);
    expect((res.body as { items: { name: string }[] }).items.map((f) => f.name)).toEqual([
      'Ailə hüququ',
      'Cinayət hüququ',
      'Əmək hüququ',
      'İnzibati hüquq',
    ]);
  });

  it('lists the topics of a field with question counts', async () => {
    const res = await ctx.http().get(`/v1/fields/${IDS.fieldCriminal}/topics`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [
        {
          id: IDS.topicAge,
          fieldId: IDS.fieldCriminal,
          slug: 'cinayet-mesuliyyeti-yasi',
          name: 'Cinayət məsuliyyəti yaşı',
          sortOrder: 0,
          questionCount: 2,
        },
      ],
    });
  });

  it('404s for an unknown field and 400s for a malformed id', async () => {
    const missing = await ctx.http().get(`/v1/fields/${IDS.missing}/topics`);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ code: 'NOT_FOUND', message: 'Sahə tapılmadı' });

    const malformed = await ctx.http().get('/v1/fields/not-a-uuid/topics');
    expect(malformed.status).toBe(400);
    expect(malformed.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect((malformed.body as { details: { path: string }[] }).details[0]?.path).toBe('id');
  });

  it('returns a topic with its summary and article refs in natural order', async () => {
    const res = await ctx.http().get(`/v1/topics/${IDS.topicAge}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: IDS.topicAge,
      summary: 'Ümumi qayda: 16 yaş.',
      questionCount: 2,
      field: { id: IDS.fieldCriminal, slug: 'cinayet-huququ', name: 'Cinayət hüququ' },
    });
    expect((res.body as { articles: { number: string }[] }).articles.map((a) => a.number)).toEqual([
      '20',
      '21',
    ]);
  });

  it('requires a session for questions and returns articleIds', async () => {
    const anonymous = await ctx.http().get(`/v1/topics/${IDS.topicAge}/questions`);
    expect(anonymous.status).toBe(401);

    const res = await ctx
      .http()
      .get(`/v1/topics/${IDS.topicAge}/questions`)
      .set('cookie', student.cookie);
    expect(res.status).toBe(200);
    const items = (res.body as { items: { id: string; articleIds: string[] }[] }).items;
    expect(items.map((q) => q.id)).toEqual([IDS.q1, IDS.q2]);
    expect(items[1]?.articleIds).toEqual([IDS.article20, IDS.article21]);
    expect(items[0]).toMatchObject({ type: 'single_choice', correctAnswer: 'B', difficulty: 1 });
  });

  it('404s for questions of an unknown topic', async () => {
    const res = await ctx
      .http()
      .get(`/v1/topics/${IDS.missing}/questions`)
      .set('cookie', student.cookie);
    expect(res.status).toBe(404);
  });
});
