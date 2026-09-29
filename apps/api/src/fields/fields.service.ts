import { Injectable } from '@nestjs/common';
import { asc, count, eq } from 'drizzle-orm';
import type { Field, TopicSummary } from '@huquq/core';
import { field, question, topic, type Database } from '@huquq/db';
import { ApiException } from '../common/api-exception.js';
import { InjectDb } from '../db/db.module.js';

@Injectable()
export class FieldsService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** All fields; names sort with the column's az-x-icu collation. */
  async list(): Promise<Field[]> {
    return this.db
      .select({ id: field.id, slug: field.slug, name: field.name, sortOrder: field.sortOrder })
      .from(field)
      .orderBy(asc(field.sortOrder), asc(field.name));
  }

  async topics(fieldId: string): Promise<TopicSummary[]> {
    const [found] = await this.db.select({ id: field.id }).from(field).where(eq(field.id, fieldId));
    if (!found) throw ApiException.notFound('Sahə tapılmadı');

    return this.db
      .select({
        id: topic.id,
        fieldId: topic.fieldId,
        slug: topic.slug,
        name: topic.name,
        sortOrder: topic.sortOrder,
        questionCount: count(question.id),
      })
      .from(topic)
      .leftJoin(question, eq(question.topicId, topic.id))
      .where(eq(topic.fieldId, fieldId))
      .groupBy(topic.id)
      .orderBy(asc(topic.sortOrder), asc(topic.name));
  }
}
