import { Injectable } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import type { LawArticleRef, TopicDetail } from '@huquq/core';
import { field, lawArticle, question, questionArticle, topic, type Database } from '@huquq/db';
import { ApiException } from '../common/api-exception.js';
import { InjectDb } from '../db/db.module.js';

const naturalOrder = new Intl.Collator('en', { numeric: true });

@Injectable()
export class TopicsService {
  constructor(@InjectDb() private readonly db: Database) {}

  async assertExists(topicId: string): Promise<void> {
    const [found] = await this.db.select({ id: topic.id }).from(topic).where(eq(topic.id, topicId));
    if (!found) throw ApiException.notFound('Mövzu tapılmadı');
  }

  async detail(topicId: string): Promise<TopicDetail> {
    const [row] = await this.db
      .select({
        id: topic.id,
        fieldId: topic.fieldId,
        slug: topic.slug,
        name: topic.name,
        summary: topic.summary,
        sortOrder: topic.sortOrder,
        field: { id: field.id, slug: field.slug, name: field.name },
      })
      .from(topic)
      .innerJoin(field, eq(field.id, topic.fieldId))
      .where(eq(topic.id, topicId));
    if (!row) throw ApiException.notFound('Mövzu tapılmadı');

    const [counted] = await this.db
      .select({ value: count() })
      .from(question)
      .where(eq(question.topicId, topicId));

    return { ...row, questionCount: counted?.value ?? 0, articles: await this.articles(topicId) };
  }

  /** The official sources of a topic: every article its questions cite. */
  private async articles(topicId: string): Promise<LawArticleRef[]> {
    const rows = await this.db
      .selectDistinct({
        id: lawArticle.id,
        code: lawArticle.code,
        number: lawArticle.number,
        version: lawArticle.version,
        sourceUrl: lawArticle.sourceUrl,
      })
      .from(lawArticle)
      .innerJoin(questionArticle, eq(questionArticle.articleId, lawArticle.id))
      .innerJoin(question, eq(question.id, questionArticle.questionId))
      .where(eq(question.topicId, topicId));
    return rows.sort(
      (a, b) =>
        naturalOrder.compare(a.code, b.code) ||
        naturalOrder.compare(a.number, b.number) ||
        naturalOrder.compare(a.version, b.version),
    );
  }
}
