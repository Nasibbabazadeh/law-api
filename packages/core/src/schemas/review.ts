import { z } from 'zod';
import { StudyDaySchema, TimeZoneSchema, UuidSchema } from './common';
import { FieldRefSchema } from './content';

export const ReviewQueueItemSchema = z
  .object({
    questionId: UuidSchema,
    topicId: UuidSchema,
    step: z.number().int().min(0).max(3),
    correctStreak: z.number().int().min(0),
    dueDay: StudyDaySchema,
    /** Days past due (0 when due today). */
    overdueDays: z.number().int().min(0),
    wrongCount: z.number().int().min(0),
    lastAttemptDay: StudyDaySchema,
  })
  .meta({ id: 'ReviewQueueItem' });
export type ReviewQueueItem = z.infer<typeof ReviewQueueItemSchema>;

export const ReviewFieldGroupSchema = z
  .object({
    field: FieldRefSchema,
    count: z.number().int(),
    items: z.array(ReviewQueueItemSchema),
  })
  .meta({ id: 'ReviewFieldGroup' });
export type ReviewFieldGroup = z.infer<typeof ReviewFieldGroupSchema>;

export const ReviewTodaySchema = z
  .object({
    today: StudyDaySchema,
    timezone: TimeZoneSchema,
    totalDue: z.number().int(),
    groups: z.array(ReviewFieldGroupSchema),
    /** Items falling due on each of the next 7 days, tomorrow first. */
    upcoming: z.array(z.object({ day: StudyDaySchema, count: z.number().int() })),
  })
  .meta({ id: 'ReviewToday' });
export type ReviewToday = z.infer<typeof ReviewTodaySchema>;
