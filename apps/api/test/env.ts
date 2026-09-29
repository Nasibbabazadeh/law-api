import { loadDotEnv } from '../src/common/env.js';
import { loadConfig, type AppConfig } from '../src/common/config.js';

loadDotEnv();

export function testDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error('DATABASE_URL_TEST is not set. API tests need a dedicated Postgres database.');
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL_TEST must differ from DATABASE_URL: tests truncate every table.');
  }
  return url;
}

export function testConfig(): AppConfig {
  return loadConfig({
    ...process.env,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: testDatabaseUrl(),
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'test-secret-0123456789abcdefghijklmnop',
    BETTER_AUTH_URL: 'http://localhost:3000',
    TRUSTED_ORIGINS: 'http://localhost:3000',
    JOBS_ENABLED: 'false',
    AUTH_RATE_LIMIT_ENABLED: 'false',
  });
}
