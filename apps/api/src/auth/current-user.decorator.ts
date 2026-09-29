import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthSession, AuthUser } from './auth.js';

export interface AuthedRequest extends Request {
  session?: AuthSession | null;
  user?: AuthUser | null;
}

/**
 * The signed-in user, attached by the global Better Auth guard.
 * Only use on routes that require authentication (the default).
 */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<AuthedRequest>();
  if (!request.user) {
    // The global AuthGuard guarantees a session on protected routes.
    throw new Error('CurrentUser used on a route without an authenticated session');
  }
  return request.user;
});

export const CurrentSession = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthSession => {
    const request = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!request.session) {
      throw new Error('CurrentSession used on a route without an authenticated session');
    }
    return request.session;
  },
);
