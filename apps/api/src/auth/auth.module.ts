import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import type { Database } from '@huquq/db';
import { APP_CONFIG, type AppConfig } from '../common/config.js';
import { DB } from '../db/db.module.js';
import { createAuth } from './auth.js';
import { RolesGuard } from './roles.js';
import { SessionController } from './session.controller.js';

@Module({
  imports: [
    BetterAuthModule.forRootAsync({
      inject: [DB, APP_CONFIG],
      useFactory: (db: Database, config: AppConfig) => ({
        auth: createAuth(db, config),
        // CORS is configured once in main.ts for every route (PATCH included).
        disableTrustedOriginsCors: true,
        bodyParser: { json: { limit: '1mb' } },
      }),
    }),
  ],
  controllers: [SessionController],
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class AuthModule {}
