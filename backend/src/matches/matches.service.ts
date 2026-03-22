import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { matchesTable, matchPlayersTable } from '../database/schema';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class MatchesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getMatchHistory(playerId: string) {
    return this.databaseService.db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.playerId, playerId))
      .orderBy(desc(matchPlayersTable.createdAt))
      .limit(20);
  }

  async getMatch(matchId: string) {
    const [match] = await this.databaseService.db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId));

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return match;
  }

  async getMatchPlayers(matchId: string) {
    return this.databaseService.db
      .select()
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.matchId, matchId));
  }
}
