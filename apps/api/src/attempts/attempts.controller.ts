import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { AttemptBatchResultSchema, AttemptBatchSchema, type AttemptBatchResult } from '@huquq/core';
import type { AuthUser } from '../auth/auth.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ApiErrors } from '../common/openapi-errors.js';
import { AttemptsService } from './attempts.service.js';

class AttemptBatchDto extends createZodDto(AttemptBatchSchema) {}
class AttemptBatchResultDto extends createZodDto(AttemptBatchResultSchema) {}

@ApiTags('attempts')
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upload a batch of answers',
    description: [
      'Rows are validated one by one: each gets `accepted`, `duplicate` (same client id already stored, so retries are safe) or `invalid` with a reason. One bad row never fails the batch.',
      '',
      'The server grades each answer and derives the study day from `answeredAt` + `timezone`; clients never send correctness or a day. Only the first attempt per question per study day moves the review ladder.',
    ].join('\n'),
  })
  @ApiBody({ type: AttemptBatchDto })
  @ApiErrors(400, 401)
  @ZodResponse({ type: AttemptBatchResultDto })
  submit(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<AttemptBatchResult> {
    // The body is validated row by row in the service (see AttemptBatchSchema for the shape).
    return this.attempts.submit(user.id, body);
  }
}
