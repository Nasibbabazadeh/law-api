import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { SessionResponseSchema, type SessionResponse } from '@huquq/core';
import type { AuthSession } from './auth.js';
import { CurrentSession } from './current-user.decorator.js';
import { toSessionUser } from './session-user.js';

class SessionResponseDto extends createZodDto(SessionResponseSchema) {}

@ApiTags('auth')
@Controller('session')
export class SessionController {
  @Get()
  @ApiOperation({
    summary: 'Current session',
    description:
      'Returns the signed-in user and session. Better Auth also serves GET /v1/auth/get-session.',
  })
  @ApiUnauthorizedResponse({ description: 'No valid session' })
  @ZodResponse({ type: SessionResponseDto })
  get(@CurrentSession() current: AuthSession): SessionResponse {
    const { user, session } = current;
    return {
      user: toSessionUser(user),
      session: { id: session.id, expiresAt: session.expiresAt.toISOString() },
    };
  }
}
