import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { notificationsTable } from '../database/schema';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class NotificationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getNotifications(playerId: string) {
    return this.databaseService.db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.playerId, playerId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
  }

  async getUnreadCount(playerId: string) {
    const rows = await this.databaseService.db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.playerId, playerId),
          eq(notificationsTable.isRead, false),
        ),
      );

    return { count: rows.length };
  }

  async markAsRead(playerId: string, notificationId: string) {
    const [updated] = await this.databaseService.db
      .update(notificationsTable)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.playerId, playerId),
        ),
      )
      .returning();

    if (!updated) {
      throw new NotFoundException('Notification not found');
    }

    return updated;
  }

  async markAllAsRead(playerId: string) {
    await this.databaseService.db
      .update(notificationsTable)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.playerId, playerId),
          eq(notificationsTable.isRead, false),
        ),
      );

    return { updated: true };
  }
}
