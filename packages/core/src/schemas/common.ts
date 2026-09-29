import { z } from 'zod';
import { isStudyDay, isValidTimeZone } from '../time/study-day';

export const UuidSchema = z.uuid();

export const StudyDaySchema = z
  .string()
  .refine(isStudyDay, { message: 'Expected a calendar date YYYY-MM-DD' })
  .meta({ example: '2026-09-29', description: 'Local study day (YYYY-MM-DD)' });

export const TimeZoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine(isValidTimeZone, { message: 'Unknown IANA timezone' })
  .meta({ example: 'Asia/Baku', description: 'IANA timezone name' });

export const IsoDateTimeSchema = z.iso
  .datetime({ offset: true })
  .meta({ example: '2026-09-29T08:15:00.000Z' });

export const SlugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Expected a lowercase slug (a-z, 0-9, -)' });

export const IdParamSchema = z.object({ id: UuidSchema });
