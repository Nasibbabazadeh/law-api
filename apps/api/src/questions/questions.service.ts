import { Injectable } from '@nestjs/common';
import { asc, eq, inArray } from 'drizzle-orm';
import type { Question } from '@huquq/core';
import { question, questionArticle, type Executor } from '@huquq/db';
import { InjectDb } from '../db/db.module.js';

export type QuestionRow = typeof question.$inferSelect;

@Injectable()
export class QuestionsService {
  constructor(@InjectDb() private readonly db: Executor) {}

  async listByTopic(topicId: string): Promise<Question[]> {
    const rows = await this.db
      .select()
      .from(question)
      .where(eq(question.topicId, topicId))
      .orderBy(asc(question.difficulty), asc(question.id));
    return this.withArticleIds(rows);
  }

  /** Questions by id, for grading. Unknown ids are simply absent from the map. */
  async findByIds(
    ids: readonly string[],
    db: Executor = this.db,
  ): Promise<Map<string, QuestionRow>> {
    if (ids.length === 0) return new Map();
    const rows = await db
      .select()
      .from(question)
      .where(inArray(question.id, [...ids]));
    return new Map(rows.map((row) => [row.id, row]));
  }

  private async withArticleIds(rows: QuestionRow[]): Promise<Question[]> {
    const articleIds = new Map<string, string[]>();
    if (rows.length > 0) {
      const links = await this.db
        .select()
        .from(questionArticle)
        .where(
          inArray(
            questionArticle.questionId,
            rows.map((row) => row.id),
          ),
        );
      for (const link of links) {
        const list = articleIds.get(link.questionId) ?? [];
        list.push(link.articleId);
        articleIds.set(link.questionId, list);
      }
    }
    return rows.map((row) => ({
      id: row.id,
      topicId: row.topicId,
      type: row.type,
      prompt: row.prompt,
      options: row.options,
      correctAnswer: row.correctAnswer,
      explanation: row.explanation,
      difficulty: row.difficulty,
      articleIds: (articleIds.get(row.id) ?? []).sort(),
    }));
  }
}
