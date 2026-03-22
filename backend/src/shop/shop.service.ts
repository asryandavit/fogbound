import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  shopItemsTable,
  playerInventoryTable,
  playersTable,
} from '../database/schema';
import { eq, and, asc } from 'drizzle-orm';

@Injectable()
export class ShopService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getShopItems() {
    return this.databaseService.db
      .select()
      .from(shopItemsTable)
      .where(eq(shopItemsTable.isActive, true))
      .orderBy(asc(shopItemsTable.sortOrder));
  }

  async getFeaturedItems() {
    return this.databaseService.db
      .select()
      .from(shopItemsTable)
      .where(
        and(
          eq(shopItemsTable.isActive, true),
          eq(shopItemsTable.isFeatured, true),
        ),
      )
      .orderBy(asc(shopItemsTable.sortOrder));
  }

  async purchaseItem(playerId: string, itemId: string) {
    const [item] = await this.databaseService.db
      .select()
      .from(shopItemsTable)
      .where(eq(shopItemsTable.id, itemId));

    if (!item) {
      throw new NotFoundException('Shop item not found');
    }

    const [existing] = await this.databaseService.db
      .select()
      .from(playerInventoryTable)
      .where(
        and(
          eq(playerInventoryTable.playerId, playerId),
          eq(playerInventoryTable.shopItemId, itemId),
        ),
      );

    if (existing) {
      throw new ConflictException('Item already owned');
    }

    const [player] = await this.databaseService.db
      .select()
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (player.gems < item.price) {
      throw new BadRequestException('Not enough gems');
    }

    await this.databaseService.db
      .update(playersTable)
      .set({ gems: player.gems - item.price })
      .where(eq(playersTable.id, playerId));

    await this.databaseService.db.insert(playerInventoryTable).values({
      playerId,
      shopItemId: itemId,
      purchasedAt: new Date(),
    });

    return { success: true, message: 'Item purchased successfully' };
  }
}
