import { z } from 'zod';
import { IsoDateTimeSchema, SlugSchema, StudyDaySchema, TimeZoneSchema } from './common';
import { FieldRefSchema } from './content';
import { UserRoleSchema } from './enums';

export const MAX_INTERESTS = 6;

export const InterestsSchema = z
  .array(SlugSchema)
  .max(MAX_INTERESTS)
  .refine((slugs) => new Set(slugs).size === slugs.length, { message: 'Duplicate interests' })
  .meta({ description: 'Field slugs the user is interested in', example: ['cinayet-huququ'] });

export const StreakSchema = z.object({
  current: z.number().int(),
  longest: z.number().int(),
  lastActiveDay: StudyDaySchema.nullable(),
});

export const FieldStatsSchema = z.object({
  field: FieldRefSchema,
  attempts: z.number().int(),
  correct: z.number().int(),
  accuracy: z.number().int().min(0).max(100),
});

export const StatsSchema = z.object({
  totalAttempts: z.number().int(),
  correctAttempts: z.number().int(),
  accuracy: z.number().int().min(0).max(100),
  questionsAnswered: z.number().int(),
  topicsPracticed: z.number().int(),
  activeDays: z.number().int(),
  inReview: z.number().int(),
  mastered: z.number().int(),
  perField: z.array(FieldStatsSchema),
});

export const MeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: UserRoleSchema,
  interests: z.array(z.string()),
  locale: z.string(),
  timezone: z.string(),
  createdAt: IsoDateTimeSchema,
  today: StudyDaySchema,
  streak: StreakSchema,
  stats: StatsSchema,
});
export type Me = z.infer<typeof MeSchema>;

export const MePatchSchema = z
  .object({
    interests: InterestsSchema.optional(),
    timezone: TimeZoneSchema.optional(),
  })
  .strict()
  .refine((patch) => patch.interests !== undefined || patch.timezone !== undefined, {
    message: 'Provide at least one of: interests, timezone',
  });
export type MePatch = z.infer<typeof MePatchSchema>;
