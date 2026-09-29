import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { ReviewTodaySchema, type ReviewToday } from '@huquq/core';
import type { AuthUser } from '../auth/auth.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { toSessionUser } from '../auth/session-user.js';
import { ApiErrors } from '../common/openapi-errors.js';
import { ReviewService } from './review.service.js';

class ReviewTodayDto extends createZodDto(ReviewTodaySchema) {}

@ApiTags('review')
@Controller('review')
export class ReviewController {
  constructor(private readonly review: ReviewService) {}

  @Get('today')
  @ApiOperation({
    summary: 'Review queue for today',
    description:
      "Questions due today or overdue, grouped by field, plus counts for the next 7 days. 'Today' is the study day in the user's profile timezone.",
  })
  @ApiErrors(401)
  @ZodResponse({ type: ReviewTodayDto })
  today(@CurrentUser() user: AuthUser): Promise<ReviewToday> {
    return this.review.today(user.id, toSessionUser(user).timezone);
  }
}
