import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import {
  BookmarkCreateSchema,
  BookmarkKeySchema,
  BookmarkListQuerySchema,
  BookmarkListSchema,
  BookmarkSchema,
  type Bookmark,
  type BookmarkList,
} from '@huquq/core';
import type { AuthUser } from '../auth/auth.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ApiErrors } from '../common/openapi-errors.js';
import { BookmarksService } from './bookmarks.service.js';

class BookmarkCreateDto extends createZodDto(BookmarkCreateSchema) {}
class BookmarkKeyDto extends createZodDto(BookmarkKeySchema) {}
class BookmarkListQueryDto extends createZodDto(BookmarkListQuerySchema) {}
class BookmarkDto extends createZodDto(BookmarkSchema) {}
class BookmarkListDto extends createZodDto(BookmarkListSchema) {}

@ApiTags('bookmarks')
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Get()
  @ApiOperation({ summary: 'List bookmarks, newest first' })
  @ApiErrors(400, 401)
  @ZodResponse({ type: BookmarkListDto })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: BookmarkListQueryDto,
  ): Promise<BookmarkList> {
    return { items: await this.bookmarks.list(user.id, query.targetType) };
  }

  @Post()
  @ApiOperation({ summary: 'Bookmark a question or topic (idempotent)' })
  @ApiErrors(400, 401, 404)
  @ZodResponse({ status: HttpStatus.CREATED, type: BookmarkDto })
  create(@CurrentUser() user: AuthUser, @Body() body: BookmarkCreateDto): Promise<Bookmark> {
    return this.bookmarks.create(user.id, body);
  }

  @Delete(':targetType/:targetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bookmark (hard delete)' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiErrors(400, 401, 404)
  async remove(@CurrentUser() user: AuthUser, @Param() params: BookmarkKeyDto): Promise<void> {
    await this.bookmarks.remove(user.id, params.targetType, params.targetId);
  }
}
