import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { MePatchSchema, MeSchema, type Me } from '@huquq/core';
import type { AuthUser } from '../auth/auth.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ApiErrors } from '../common/openapi-errors.js';
import { MeService } from './me.service.js';

class MeDto extends createZodDto(MeSchema) {}
class MePatchDto extends createZodDto(MePatchSchema) {}

@ApiTags('me')
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  @ApiOperation({ summary: 'Profile with streak and learning stats (derived from attempts)' })
  @ApiErrors(401)
  @ZodResponse({ type: MeDto })
  get(@CurrentUser() user: AuthUser): Promise<Me> {
    return this.me.get(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update interests (field slugs) and/or timezone' })
  @ApiErrors(400, 401)
  @ZodResponse({ type: MeDto })
  update(@CurrentUser() user: AuthUser, @Body() body: MePatchDto): Promise<Me> {
    return this.me.update(user.id, body);
  }
}
