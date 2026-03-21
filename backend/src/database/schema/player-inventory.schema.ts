import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { playersTable } from './players.schema';
import { shopItemsTable } from './shop-items.schema';

export const playerInventoryTable = pgTable('player_inventory', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  playerId: uuid('player_id')
    .notNull()
    .references(() => playersTable.id),
  shopItemId: uuid('shop_item_id')
    .notNull()
    .references(() => shopItemsTable.id),
  purchasedAt: timestamp('purchased_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type PlayerInventory = typeof playerInventoryTable.$inferSelect;
export type NewPlayerInventory = typeof playerInventoryTable.$inferInsert;
