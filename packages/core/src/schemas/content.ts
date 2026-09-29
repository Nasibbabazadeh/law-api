import { z } from 'zod';
import { UuidSchema } from './common';
import { QuestionOptionSchema, QuestionTypeSchema } from './enums';

export const FieldSchema = z
  .object({
    id: UuidSchema,
    slug: z.string(),
    name: z.string(),
    sortOrder: z.number().int(),
  })
  .meta({ id: 'Field' });
export type Field = z.infer<typeof FieldSchema>;

export const FieldListSchema = z.object({ items: z.array(FieldSchema) }).meta({ id: 'FieldList' });
export type FieldList = z.infer<typeof FieldListSchema>;

export const FieldRefSchema = FieldSchema.pick({ id: true, slug: true, name: true });

export const TopicSummarySchema = z
  .object({
    id: UuidSchema,
    fieldId: UuidSchema,
    slug: z.string(),
    name: z.string(),
    sortOrder: z.number().int(),
    questionCount: z.number().int(),
  })
  .meta({ id: 'TopicSummary' });
export type TopicSummary = z.infer<typeof TopicSummarySchema>;

export const TopicListSchema = z
  .object({ items: z.array(TopicSummarySchema) })
  .meta({ id: 'TopicList' });
export type TopicList = z.infer<typeof TopicListSchema>;

export const LawArticleRefSchema = z
  .object({
    id: UuidSchema,
    code: z.string(),
    number: z.string(),
    version: z.string(),
    sourceUrl: z.string().nullable(),
  })
  .meta({ id: 'LawArticleRef' });
export type LawArticleRef = z.infer<typeof LawArticleRefSchema>;

export const TopicDetailSchema = TopicSummarySchema.extend({
  summary: z.string(),
  field: FieldRefSchema,
  /** Official sources: the articles referenced by the topic's questions. */
  articles: z.array(LawArticleRefSchema),
}).meta({ id: 'TopicDetail' });
export type TopicDetail = z.infer<typeof TopicDetailSchema>;

export const QuestionSchema = z
  .object({
    id: UuidSchema,
    topicId: UuidSchema,
    type: QuestionTypeSchema,
    prompt: z.string(),
    options: z.array(QuestionOptionSchema),
    correctAnswer: z.string(),
    explanation: z.string(),
    difficulty: z.number().int().min(1).max(3),
    articleIds: z.array(UuidSchema),
  })
  .meta({ id: 'Question' });
export type Question = z.infer<typeof QuestionSchema>;

export const QuestionListSchema = z
  .object({ items: z.array(QuestionSchema) })
  .meta({ id: 'QuestionList' });
export type QuestionList = z.infer<typeof QuestionListSchema>;
