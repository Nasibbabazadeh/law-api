import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { APP_CONFIG, type AppConfig } from './config.js';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.LOG_LEVEL,
          transport:
            config.NODE_ENV === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
              : undefined,
          redact: {
            paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
            censor: '[redacted]',
          },
          autoLogging: {
            ignore: (req) => req.url === '/v1/health',
          },
          customProps: (req) => {
            const user = (req as { user?: { id?: string } | null }).user;
            return user?.id ? { userId: user.id } : {};
          },
        },
      }),
    }),
  ],
})
export class LoggerModule {}
