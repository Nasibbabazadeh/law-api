import { z } from 'zod';
import { IsoDateTimeSchema, TimeZoneSchema, UuidSchema } from './common';
import { AttemptContextSchema } from './enums';

export const MAX_ATTEMPT_BATCH = 500;

/**
 * One answer as recorded by the client. `id` is generated on the device, so a retried
 * upload of the same attempt is recognised as a duplicate. The client does not send
 * correctness or the study day: the server derives both.
 */
export const AttemptInputSchema = z
  .object({
    id: UuidSchema,
    questionId: UuidSchema,
    context: AttemptContextSchema,
    answer: z.string().trim().min(1).max(200),
    answeredAt: IsoDateTimeSchema,
    timezone: TimeZoneSchema,
  })
  .meta({ id: 'AttemptInput' });
export type AttemptInput = z.infer<typeof AttemptInputSchema>;

/** Documented request body. Rows are validated one by one, so a bad row never fails the batch. */
export const AttemptBatchSchema = z
  .object({ attempts: z.array(AttemptInputSchema).min(1).max(MAX_ATTEMPT_BATCH) })
  .meta({ id: 'AttemptBatch' });
export type AttemptBatch = z.infer<typeof AttemptBatchSchema>;

/** Envelope check applied before per-row validation. */
export const AttemptBatchEnvelopeSchema = z.object({
  attempts: z.array(z.unknown()).min(1).max(MAX_ATTEMPT_BATCH),
});

export const ATTEMPT_ROW_STATUSES = ['accepted', 'duplicate', 'invalid'] as const;
export const AttemptRowStatusSchema = z.enum(ATTEMPT_ROW_STATUSES);
export type AttemptRowStatus = z.infer<typeof AttemptRowStatusSchema>;

export const AttemptRowResultSchema = z
  .object({
    /** Position of the row in the request. */
    index: z.number().int().min(0),
    /** The row's id when it had a readable one. */
    id: z.string().nullable(),
    status: AttemptRowStatusSchema,
    /** Present for `invalid` rows. */
    reason: z.string().optional(),
  })
  .meta({ id: 'AttemptRowResult' });
export type AttemptRowResult = z.infer<typeof AttemptRowResultSchema>;

export const AttemptBatchResultSchema = z
  .object({
    results: z.array(AttemptRowResultSchema),
    summary: z.object({
      accepted: z.number().int(),
      duplicate: z.number().int(),
      invalid: z.number().int(),
    }),
  })
  .meta({ id: 'AttemptBatchResult' });
export type AttemptBatchResult = z.infer<typeof AttemptBatchResultSchema>;
