import { z } from 'zod';

export const USER_ROLES = ['student', 'teacher'] as const;
export const UserRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof UserRoleSchema>;

/** Where an answer came from. Wrong answers from any context enter the review queue. */
export const ATTEMPT_CONTEXTS = ['quiz', 'drill', 'exam', 'review', 'group'] as const;
export const AttemptContextSchema = z.enum(ATTEMPT_CONTEXTS);
export type AttemptContext = z.infer<typeof AttemptContextSchema>;

export const QUESTION_TYPES = ['single_choice', 'true_false'] as const;
export const QuestionTypeSchema = z.enum(QUESTION_TYPES);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

/** `term` joins this list with the glossary. */
export const BOOKMARK_TARGET_TYPES = ['question', 'topic'] as const;
export const BookmarkTargetTypeSchema = z.enum(BOOKMARK_TARGET_TYPES);
export type BookmarkTargetType = z.infer<typeof BookmarkTargetTypeSchema>;

export const QuestionOptionSchema = z.object({
  key: z.string().min(1).max(8),
  text: z.string().min(1),
});
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
