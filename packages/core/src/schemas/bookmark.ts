import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common';
import { BookmarkTargetTypeSchema } from './enums';

export const BookmarkCreateSchema = z.object({
  targetType: BookmarkTargetTypeSchema,
  targetId: UuidSchema,
});
export type BookmarkCreate = z.infer<typeof BookmarkCreateSchema>;

export const BookmarkKeySchema = BookmarkCreateSchema;

export const BookmarkSchema = z.object({
  targetType: BookmarkTargetTypeSchema,
  targetId: UuidSchema,
  createdAt: IsoDateTimeSchema,
});
export type Bookmark = z.infer<typeof BookmarkSchema>;

export const BookmarkListSchema = z.object({ items: z.array(BookmarkSchema) });
export type BookmarkList = z.infer<typeof BookmarkListSchema>;

export const BookmarkListQuerySchema = z.object({
  targetType: BookmarkTargetTypeSchema.optional(),
});
export type BookmarkListQuery = z.infer<typeof BookmarkListQuerySchema>;
