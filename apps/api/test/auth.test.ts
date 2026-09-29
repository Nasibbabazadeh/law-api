import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ApiException } from '../src/common/api-exception.js';
import { ROLES_KEY, RolesGuard } from '../src/auth/roles.js';
import { createTestApp, resetDb, signUp, type TestContext } from './helpers.js';

describe('auth', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(ctx.db);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('signs up with a role, interests and timezone, and returns the session', async () => {
    const user = await signUp(ctx, {
      role: 'teacher',
      interests: ['cinayet-huququ'],
      timezone: 'Europe/Istanbul',
    });
    const res = await ctx.http().get('/v1/session').set('cookie', user.cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      user: {
        id: user.id,
        role: 'teacher',
        interests: ['cinayet-huququ'],
        locale: 'az',
        timezone: 'Europe/Istanbul',
      },
      session: { id: expect.any(String) as string },
    });
  });

  it('defaults to the student role and Asia/Baku', async () => {
    const user = await signUp(ctx);
    const res = await ctx.http().get('/v1/session').set('cookie', user.cookie);
    expect(res.body).toMatchObject({ user: { role: 'student', timezone: 'Asia/Baku' } });
  });

  it('rejects an unknown role or timezone at sign-up', async () => {
    const badRole = await ctx
      .http()
      .post('/v1/auth/sign-up/email')
      .set('origin', 'http://localhost:3000')
      .send({ name: 'X', email: 'x@example.az', password: 'parol-12345', role: 'admin' });
    expect(badRole.status).toBe(400);

    const badTz = await ctx
      .http()
      .post('/v1/auth/sign-up/email')
      .set('origin', 'http://localhost:3000')
      .send({ name: 'X', email: 'x@example.az', password: 'parol-12345', timezone: 'Mars/Base' });
    expect(badTz.status).toBe(400);
  });

  it('signs in with email and password', async () => {
    const user = await signUp(ctx);
    const res = await ctx
      .http()
      .post('/v1/auth/sign-in/email')
      .set('origin', 'http://localhost:3000')
      .send({ email: user.email, password: 'parol-12345' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('accepts a password reset request (the link is logged until email is wired)', async () => {
    const user = await signUp(ctx);
    const res = await ctx
      .http()
      .post('/v1/auth/request-password-reset')
      .set('origin', 'http://localhost:3000')
      .send({ email: user.email, redirectTo: 'http://localhost:3000/reset' });
    expect(res.status).toBe(200);
  });

  it('returns the error envelope without a session', async () => {
    const res = await ctx.http().get('/v1/session');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'UNAUTHORIZED', message: 'Daxil olmaq tələb olunur' });
  });

  it('keeps /v1/health public', async () => {
    const res = await ctx.http().get('/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
  });
});

describe('RolesGuard', () => {
  const TestController = function TestController() {
    // stand-in for a controller class
  };
  const contextFor = (role: string | undefined, required: string[] | undefined) => {
    const handler = () => undefined;
    if (required) Reflect.defineMetadata(ROLES_KEY, required, handler);
    return {
      getHandler: () => handler,
      getClass: () => TestController,
      switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : null }) }),
    } as unknown as ExecutionContext;
  };
  const guard = new RolesGuard(new Reflector());

  it('allows routes without @Roles', () => {
    expect(guard.canActivate(contextFor('student', undefined))).toBe(true);
  });

  it('allows a matching role', () => {
    expect(guard.canActivate(contextFor('teacher', ['teacher']))).toBe(true);
  });

  it('forbids other roles', () => {
    expect(() => guard.canActivate(contextFor('student', ['teacher']))).toThrow(ApiException);
    expect(() => guard.canActivate(contextFor(undefined, ['teacher']))).toThrow(ApiException);
  });
});
