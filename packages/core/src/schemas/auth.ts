import { z } from 'zod';
import { IsoDateTimeSchema, TimeZoneSchema } from './common';
import { UserRoleSchema } from './enums';
import { InterestsSchema } from './me';

/**
 * Extra fields accepted by Better Auth's `POST /v1/auth/sign-up/email` on top of
 * name, email and password. Better Auth validates them with these schemas.
 */
export const SignUpExtrasSchema = z.object({
  role: UserRoleSchema.default('student'),
  interests: InterestsSchema.optional(),
  timezone: TimeZoneSchema.optional(),
});

export const SessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: UserRoleSchema,
  interests: z.array(z.string()),
  locale: z.string(),
  timezone: z.string(),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

export const SessionResponseSchema = z
  .object({
    user: SessionUserSchema,
    session: z.object({ id: z.string(), expiresAt: IsoDateTimeSchema }),
  })
  .meta({ id: 'SessionResponse' });
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const HealthSchema = z
  .object({
    status: z.enum(['ok', 'degraded']),
    db: z.enum(['up', 'down']),
    time: IsoDateTimeSchema,
  })
  .meta({ id: 'Health' });
export type Health = z.infer<typeof HealthSchema>;
