import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { playersTable, playerStatsTable } from '../database/schema';
import { eq, and, ne } from 'drizzle-orm';
import { UpdatePlayerDto } from './dto/update-player.dto';

@Injectable()
export class PlayersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getProfile(playerId: string) {
    const [player] = await this.databaseService.db
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return player;
  }

  async getMyProfile(playerId: string) {
    return this.getProfile(playerId);
  }

  async getStats(playerId: string) {
    const [stats] = await this.databaseService.db
      .select()
      .from(playerStatsTable)
      .where(eq(playerStatsTable.playerId, playerId));

    if (!stats) {
      throw new NotFoundException('Player stats not found');
    }

    return stats;
  }

  async updateProfile(playerId: string, dto: UpdatePlayerDto) {
    if (dto.username) {
      const [existing] = await this.databaseService.db
        .select()
        .from(playersTable)
        .where(
          and(
            eq(playersTable.username, dto.username),
            ne(playersTable.id, playerId),
          ),
        );

      if (existing) {
        throw new ConflictException('Username already taken');
      }
    }

    const [updated] = await this.databaseService.db
      .update(playersTable)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(playersTable.id, playerId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Player not found');
    }

    return updated;
  }
}
