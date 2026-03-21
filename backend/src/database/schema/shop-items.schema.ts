import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const shopItemsTable = pgTable('shop_items', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
  type: varchar('type', { length: 30 }).notNull(),
  currency: varchar('currency', { length: 20 }).notNull(),
  price: integer('price').notNull(),
  rewardType: varchar('reward_type', { length: 20 }).notNull(),
  rewardAmount: integer('reward_amount').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  isFeatured: boolean('is_featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  storeProductId: varchar('store_product_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type ShopItem = typeof shopItemsTable.$inferSelect;
export type NewShopItem = typeof shopItemsTable.$inferInsert;
