import { z } from 'zod';
import { TRUE_FALSE_KEYS } from '../questions/grade';
import { SlugSchema, UuidSchema } from './common';
import { QuestionOptionSchema, QuestionTypeSchema } from './enums';

/** Reference to a law article; without `version` the importer links the latest version. */
export const ArticleRefSchema = z.object({
  code: z.string().trim().min(1).max(32),
  number: z.string().trim().min(1).max(32),
  version: z.string().trim().min(1).max(32).optional(),
});
export type ArticleRef = z.infer<typeof ArticleRefSchema>;

export const DEFAULT_TRUE_FALSE_OPTIONS = [
  { key: 'true', text: 'Doğru' },
  { key: 'false', text: 'Yanlış' },
] as const;

/**
 * One question in an import file (JSON array element, or a CSV row after
 * `csvRecordToImportInput`). An optional `id` makes re-imports update in place.
 */
export const QuestionImportRowSchema = z
  .object({
    id: UuidSchema.optional(),
    fieldSlug: SlugSchema,
    topicSlug: SlugSchema,
    type: QuestionTypeSchema,
    prompt: z.string().trim().min(5).max(2000),
    options: z.array(QuestionOptionSchema).max(8).optional(),
    correctAnswer: z.string().trim().min(1),
    explanation: z.string().trim().max(4000).default(''),
    difficulty: z.coerce.number().int().min(1).max(3).default(1),
    articles: z.array(ArticleRefSchema).default([]),
  })
  .transform((row, ctx) => {
    if (row.type === 'true_false') {
      const correctAnswer = row.correctAnswer.toLowerCase();
      if (!(TRUE_FALSE_KEYS as readonly string[]).includes(correctAnswer)) {
        ctx.addIssue({
          code: 'custom',
          path: ['correctAnswer'],
          message: 'true_false questions need correctAnswer "true" or "false"',
        });
        return z.NEVER;
      }
      const options = row.options?.length ? row.options : [...DEFAULT_TRUE_FALSE_OPTIONS];
      return { ...row, correctAnswer, options };
    }

    const options = row.options ?? [];
    if (options.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'single_choice questions need at least 2 options',
      });
      return z.NEVER;
    }
    const keys = options.map((option) => option.key);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Option keys must be unique' });
      return z.NEVER;
    }
    if (!keys.includes(row.correctAnswer)) {
      ctx.addIssue({
        code: 'custom',
        path: ['correctAnswer'],
        message: `correctAnswer must be one of: ${keys.join(', ')}`,
      });
      return z.NEVER;
    }
    return { ...row, options };
  });
export type QuestionImportRow = z.output<typeof QuestionImportRowSchema>;

/**
 * CSV columns: id, fieldSlug, topicSlug, type, prompt, options, correctAnswer,
 * explanation, difficulty, articles.
 *
 * - options: `A:Birinci variant|B:İkinci variant` (text may contain `:`, not `|`)
 * - articles: `CM:20;CM:21@2024-01-01` (code:number, optional @version)
 *
 * Returns the raw object for `QuestionImportRowSchema`; malformed cells are passed
 * through as-is so the schema reports them.
 */
export function csvRecordToImportInput(record: Record<string, string | undefined>): unknown {
  const cell = (key: string): string | undefined => {
    const value = record[key]?.trim();
    return value === undefined || value === '' ? undefined : value;
  };

  const optionsCell = cell('options');
  const options = optionsCell?.split('|').map((part) => {
    const separator = part.indexOf(':');
    if (separator <= 0) return part;
    return { key: part.slice(0, separator).trim(), text: part.slice(separator + 1).trim() };
  });

  const articlesCell = cell('articles');
  const articles = articlesCell
    ?.split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const [ref = '', version] = part.split('@');
      const separator = ref.indexOf(':');
      if (separator <= 0) return part;
      return {
        code: ref.slice(0, separator),
        number: ref.slice(separator + 1),
        ...(version ? { version } : {}),
      };
    });

  return {
    id: cell('id'),
    fieldSlug: cell('fieldSlug'),
    topicSlug: cell('topicSlug'),
    type: cell('type'),
    prompt: cell('prompt'),
    options,
    correctAnswer: cell('correctAnswer'),
    explanation: cell('explanation'),
    difficulty: cell('difficulty'),
    articles,
  };
}
