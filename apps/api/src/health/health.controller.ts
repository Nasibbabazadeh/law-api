import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { sql } from 'drizzle-orm';
import type { Response } from 'express';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { HealthSchema, type Health } from '@huquq/core';
import type { Database } from '@huquq/db';
import { InjectDb } from '../db/db.module.js';

class HealthDto extends createZodDto(HealthSchema) {}

@ApiTags('health')
@AllowAnonymous()
@Controller('health')
export class HealthController {
  constructor(@InjectDb() private readonly db: Database) {}

  @Get()
  @ApiOperation({ summary: 'Liveness and database check (503 when the database is down)' })
  @ZodResponse({ type: HealthDto })
  async check(@Res({ passthrough: true }) res: Response): Promise<Health> {
    let db: Health['db'] = 'up';
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      db = 'down';
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { status: db === 'up' ? 'ok' : 'degraded', db, time: new Date().toISOString() };
  }
}
