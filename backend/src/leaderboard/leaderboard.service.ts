import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { leaderboardsTable } from '../database/schema';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class LeaderboardService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getGlobalLeaderboard() {
    return this.databaseService.db
      .select()
      .from(leaderboardsTable)
      .where(eq(leaderboardsTable.scope, 'global'))
      .orderBy(desc(leaderboardsTable.totalPoints))
      .limit(100);
  }

  async getMapLeaderboard(mapId: string) {
    return this.databaseService.db
      .select()
      .from(leaderboardsTable)
      .where(
        and(
          eq(leaderboardsTable.scope, 'map'),
          eq(leaderboardsTable.mapId, mapId),
        ),
      )
      .orderBy(desc(leaderboardsTable.totalPoints))
      .limit(100);
  }

  async getPlayerRank(playerId: string) {
    const entries = await this.databaseService.db
      .select()
      .from(leaderboardsTable)
      .where(eq(leaderboardsTable.playerId, playerId));

    if (!entries.length) {
      throw new NotFoundException('Player not found in leaderboard');
    }

    return entries;
  }
}
