import { type DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AttemptsModule } from './attempts/attempts.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BookmarksModule } from './bookmarks/bookmarks.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { type AppConfig, ConfigModule } from './common/config.js';
import { LoggerModule } from './common/logger.module.js';
import { DbModule } from './db/db.module.js';
import { FieldsModule } from './fields/fields.module.js';
import { HealthModule } from './health/health.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { MeModule } from './me/me.module.js';
import { ReviewModule } from './review/review.module.js';
import { TopicsModule } from './topics/topics.module.js';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(config),
        LoggerModule,
        DbModule,
        JobsModule,
        AuthModule,
        HealthModule,
        FieldsModule,
        TopicsModule,
        AttemptsModule,
        ReviewModule,
        BookmarksModule,
        MeModule,
      ],
      providers: [
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    };
  }
}
