import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import {
  IdParamSchema,
  QuestionListSchema,
  TopicDetailSchema,
  type QuestionList,
  type TopicDetail,
} from '@huquq/core';
import { ApiErrors } from '../common/openapi-errors.js';
import { QuestionsService } from '../questions/questions.service.js';
import { TopicsService } from './topics.service.js';

class TopicDetailDto extends createZodDto(TopicDetailSchema) {}
class QuestionListDto extends createZodDto(QuestionListSchema) {}
class IdParamDto extends createZodDto(IdParamSchema) {}

@ApiTags('content')
@Controller('topics')
export class TopicsController {
  constructor(
    private readonly topics: TopicsService,
    private readonly questions: QuestionsService,
  ) {}

  @Get(':id')
  @AllowAnonymous()
  @ApiOperation({ summary: 'Topic summary with its official sources (law articles)' })
  @ApiErrors(400, 404)
  @ZodResponse({ type: TopicDetailDto })
  detail(@Param() params: IdParamDto): Promise<TopicDetail> {
    return this.topics.detail(params.id);
  }

  @Get(':id/questions')
  @ApiOperation({
    summary: 'Questions of a topic',
    description:
      'Includes the correct answer and explanation so the app can give instant (and offline) feedback. The server still grades every attempt itself.',
  })
  @ApiErrors(400, 401, 404)
  @ZodResponse({ type: QuestionListDto })
  async list(@Param() params: IdParamDto): Promise<QuestionList> {
    await this.topics.assertExists(params.id);
    return { items: await this.questions.listByTopic(params.id) };
  }
}
