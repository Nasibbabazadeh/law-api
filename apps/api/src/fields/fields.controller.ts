import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import {
  FieldListSchema,
  IdParamSchema,
  TopicListSchema,
  type FieldList,
  type TopicList,
} from '@huquq/core';
import { ApiErrors } from '../common/openapi-errors.js';
import { FieldsService } from './fields.service.js';

class FieldListDto extends createZodDto(FieldListSchema) {}
class TopicListDto extends createZodDto(TopicListSchema) {}
class IdParamDto extends createZodDto(IdParamSchema) {}

@ApiTags('content')
@AllowAnonymous()
@Controller('fields')
export class FieldsController {
  constructor(private readonly fields: FieldsService) {}

  @Get()
  @ApiOperation({ summary: 'List legal fields (Azerbaijani alphabetical order)' })
  @ZodResponse({ type: FieldListDto })
  async list(): Promise<FieldList> {
    return { items: await this.fields.list() };
  }

  @Get(':id/topics')
  @ApiOperation({ summary: 'List the topics of a field' })
  @ApiErrors(400, 404)
  @ZodResponse({ type: TopicListDto })
  async topics(@Param() params: IdParamDto): Promise<TopicList> {
    return { items: await this.fields.topics(params.id) };
  }
}
