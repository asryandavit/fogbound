import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const mapsTable = pgTable('maps', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).unique().notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  gridRows: integer('grid_rows').notNull(),
  gridCols: integer('grid_cols').notNull(),
  minPlayers: integer('min_players').notNull().default(2),
  maxPlayers: integer('max_players').notNull().default(4),
  explorersPerPlayer: integer('explorers_per_player').notNull(),
  baseType: varchar('base_type', { length: 50 }).notNull(),
  winCondition: varchar('win_condition', { length: 50 }).notNull(),
  turnTimerSeconds: integer('turn_timer_seconds').notNull(),
  pointsTarget: integer('points_target'),
  terrainConfig: jsonb('terrain_config').notNull(),
  treasureConfig: jsonb('treasure_config').notNull(),
  tilePool: jsonb('tile_pool').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  isPremium: boolean('is_premium').notNull().default(false),
  tier: integer('tier').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type GameMap = typeof mapsTable.$inferSelect;
export type NewGameMap = typeof mapsTable.$inferInsert;
