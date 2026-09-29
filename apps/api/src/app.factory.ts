import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { type AppConfig } from './common/config.js';
import { setupOpenApi } from './common/openapi.js';

/** Build the Nest app with every global setting. Shared by main.ts and the API tests. */
export async function createApp(config: AppConfig): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), {
    // Required by @thallesp/nestjs-better-auth: it re-adds JSON parsing for non-auth routes.
    bodyParser: false,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: config.TRUSTED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  app.enableShutdownHooks();
  setupOpenApi(app);
  return app;
}
