import { Logger } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { InterestsSchema, TimeZoneSchema, USER_ROLES, UserRoleSchema } from '@huquq/core';
import { account, session, user, verification, type Database } from '@huquq/db';
import type { AppConfig } from '../common/config.js';

const logger = new Logger('Auth');

export const AUTH_BASE_PATH = '/v1/auth';

type SocialProviders = NonNullable<Parameters<typeof betterAuth>[0]['socialProviders']>;

function socialProviders(config: AppConfig): SocialProviders {
  const providers: SocialProviders = {};
  if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
    };
  }
  if (config.APPLE_CLIENT_ID && config.APPLE_CLIENT_SECRET) {
    providers.apple = {
      clientId: config.APPLE_CLIENT_ID,
      clientSecret: config.APPLE_CLIENT_SECRET,
      ...(config.APPLE_APP_BUNDLE_IDENTIFIER
        ? { appBundleIdentifier: config.APPLE_APP_BUNDLE_IDENTIFIER }
        : {}),
    };
  }
  return providers;
}

/**
 * The Better Auth instance. Users, sessions and accounts live in our Postgres
 * (tables in @huquq/db). Mounted by `@thallesp/nestjs-better-auth` at /v1/auth/*.
 */
export function createAuth(db: Database, config: AppConfig) {
  const providers = socialProviders(config);
  return betterAuth({
    appName: 'Hüquq',
    baseURL: config.BETTER_AUTH_URL,
    basePath: AUTH_BASE_PATH,
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: [
      ...config.TRUSTED_ORIGINS,
      ...(providers.apple ? ['https://appleid.apple.com'] : []),
    ],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      // TODO(email): send through a real provider. Until then the link is logged.
      sendResetPassword: async ({ user: target, url }) => {
        logger.log({ userId: target.id, url }, 'Password reset requested');
        await Promise.resolve();
      },
    },
    socialProviders: providers,
    user: {
      additionalFields: {
        role: {
          type: [...USER_ROLES],
          required: false,
          defaultValue: 'student',
          input: true,
          validator: { input: UserRoleSchema },
        },
        interests: {
          type: 'string[]',
          required: false,
          defaultValue: [],
          input: true,
          validator: { input: InterestsSchema },
        },
        locale: {
          type: 'string',
          required: false,
          defaultValue: 'az',
          input: false,
        },
        timezone: {
          type: 'string',
          required: false,
          defaultValue: 'Asia/Baku',
          input: true,
          validator: { input: TimeZoneSchema },
        },
      },
    },
    rateLimit: { enabled: config.AUTH_RATE_LIMIT_ENABLED },
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth['$Infer']['Session'];
export type AuthUser = AuthSession['user'];
