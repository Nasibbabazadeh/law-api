import type { INestApplication } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import type { Database } from '@huquq/db';
import type { UserRole } from '@huquq/core';
import { createApp } from '../src/app.factory.js';
import { DB } from '../src/db/db.module.js';
import { testConfig } from './env.js';

export interface TestContext {
  app: INestApplication;
  db: Database;
  http: () => ReturnType<typeof request>;
}

export async function createTestApp(): Promise<TestContext> {
  const app = await createApp(testConfig());
  await app.init();
  const db = app.get<Database>(DB);
  const server = app.getHttpServer() as Parameters<typeof request>[0];
  return { app, db, http: () => request(server) };
}

/** Empty every table (the schema stays). */
export async function resetDb(db: Database): Promise<void> {
  await db.execute(sql`
    TRUNCATE TABLE
      "attempt", "review_item", "bookmark", "question_article", "question", "law_article",
      "topic", "field", "session", "account", "verification", "user"
    RESTART IDENTITY CASCADE
  `);
}

let userCounter = 0;

export interface TestUser {
  id: string;
  email: string;
  cookie: string;
}

/** Sign up through Better Auth and return the session cookie. */
export async function signUp(
  ctx: TestContext,
  extras: { role?: UserRole; interests?: string[]; timezone?: string } = {},
): Promise<TestUser> {
  userCounter++;
  const email = `user${userCounter}-${Date.now()}@example.az`;
  const res = await ctx
    .http()
    .post('/v1/auth/sign-up/email')
    .set('origin', 'http://localhost:3000')
    .send({ name: `Tələbə ${userCounter}`, email, password: 'parol-12345', ...extras });
  if (res.status !== 200) {
    throw new Error(`sign-up failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = (setCookie ?? []).map((c) => c.split(';')[0]).join('; ');
  const body = res.body as { user: { id: string } };
  return { id: body.user.id, email, cookie };
}
