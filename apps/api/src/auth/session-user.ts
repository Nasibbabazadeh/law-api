import type { SessionUser } from '@huquq/core';
import type { AuthUser } from './auth.js';

/** Map the Better Auth user to the API shape. DB defaults back the optional extra fields. */
export function toSessionUser(user: AuthUser): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image ?? null,
    role: user.role ?? 'student',
    interests: user.interests ?? [],
    locale: user.locale ?? 'az',
    timezone: user.timezone ?? 'Asia/Baku',
  };
}
