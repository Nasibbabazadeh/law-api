import {
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { APP_CONFIG, type AppConfig } from '../common/config.js';

export const JOBS = Symbol('JOBS');

/**
 * pg-boss job queue on the main Postgres (schema `pgboss`). No jobs are defined yet;
 * later phases (law-sync, review reminders, offline pack builds) register workers here.
 * Inject with `@Inject(JOBS) private readonly jobs: PgBoss | null` (null when disabled).
 */
@Global()
@Module({
  providers: [
    {
      provide: JOBS,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): PgBoss | null =>
        config.JOBS_ENABLED
          ? new PgBoss({ connectionString: config.DATABASE_URL, schema: 'pgboss' })
          : null,
    },
  ],
  exports: [JOBS],
})
export class JobsModule implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('Jobs');

  constructor(@Inject(JOBS) private readonly boss: PgBoss | null) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.boss) {
      this.logger.log('pg-boss disabled (JOBS_ENABLED=false)');
      return;
    }
    this.boss.on('error', (error) => {
      this.logger.error(error);
    });
    await this.boss.start();
    this.logger.log('pg-boss started');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.boss?.stop({ graceful: true });
  }
}
