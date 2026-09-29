import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createDb, type Database, type DbHandle } from '@huquq/db';
import { APP_CONFIG, type AppConfig } from '../common/config.js';

export const DB_HANDLE = Symbol('DB_HANDLE');
export const DB = Symbol('DB');

/** Inject the Drizzle client: `constructor(@InjectDb() private readonly db: Database)`. */
export const InjectDb = (): ParameterDecorator => Inject(DB);

@Global()
@Module({
  providers: [
    {
      provide: DB_HANDLE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): DbHandle => createDb(config.DATABASE_URL),
    },
    {
      provide: DB,
      inject: [DB_HANDLE],
      useFactory: (handle: DbHandle): Database => handle.db,
    },
  ],
  exports: [DB, DB_HANDLE],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(DB_HANDLE) private readonly handle: DbHandle) {}

  async onApplicationShutdown(): Promise<void> {
    await this.handle.pool.end();
  }
}
