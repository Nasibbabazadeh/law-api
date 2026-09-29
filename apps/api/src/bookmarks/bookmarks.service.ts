import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { Bookmark, BookmarkCreate, BookmarkTargetType } from '@huquq/core';
import { bookmark, question, topic, type Database } from '@huquq/db';
import { ApiException } from '../common/api-exception.js';
import { InjectDb } from '../db/db.module.js';

type BookmarkRow = typeof bookmark.$inferSelect;

function toBookmark(row: BookmarkRow): Bookmark {
  return {
    targetType: row.targetType,
    targetId: row.targetId,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class BookmarksService {
  constructor(@InjectDb() private readonly db: Database) {}

  async list(userId: string, targetType?: BookmarkTargetType): Promise<Bookmark[]> {
    const rows = await this.db
      .select()
      .from(bookmark)
      .where(
        and(
          eq(bookmark.userId, userId),
          targetType ? eq(bookmark.targetType, targetType) : undefined,
        ),
      )
      .orderBy(desc(bookmark.createdAt));
    return rows.map(toBookmark);
  }

  /** Idempotent: bookmarking the same target twice returns the existing bookmark. */
  async create(userId: string, input: BookmarkCreate): Promise<Bookmark> {
    await this.assertTargetExists(input.targetType, input.targetId);
    const [created] = await this.db
      .insert(bookmark)
      .values({ userId, targetType: input.targetType, targetId: input.targetId })
      .onConflictDoNothing()
      .returning();
    if (created) return toBookmark(created);

    const [existing] = await this.db
      .select()
      .from(bookmark)
      .where(this.key(userId, input.targetType, input.targetId));
    if (!existing) throw ApiException.notFound('Əlfəcin tapılmadı');
    return toBookmark(existing);
  }

  /** Hard delete (the app asks for confirmation before calling this). */
  async remove(userId: string, targetType: BookmarkTargetType, targetId: string): Promise<void> {
    const deleted = await this.db
      .delete(bookmark)
      .where(this.key(userId, targetType, targetId))
      .returning({ targetId: bookmark.targetId });
    if (deleted.length === 0) throw ApiException.notFound('Əlfəcin tapılmadı');
  }

  private key(userId: string, targetType: BookmarkTargetType, targetId: string) {
    return and(
      eq(bookmark.userId, userId),
      eq(bookmark.targetType, targetType),
      eq(bookmark.targetId, targetId),
    );
  }

  private async assertTargetExists(
    targetType: BookmarkTargetType,
    targetId: string,
  ): Promise<void> {
    const table = targetType === 'question' ? question : topic;
    const [found] = await this.db
      .select({ id: table.id })
      .from(table)
      .where(eq(table.id, targetId));
    if (!found) {
      throw ApiException.notFound(targetType === 'question' ? 'Sual tapılmadı' : 'Mövzu tapılmadı');
    }
  }
}
