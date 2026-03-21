import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { playersTable } from './players.schema';
import { mapsTable } from './maps.schema';

export const leaderboardsTable = pgTable('leaderboards', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  playerId: uuid('player_id')
    .notNull()
    .references(() => playersTable.id),
  mapId: uuid('map_id').references(() => mapsTable.id),
  scope: varchar('scope', { length: 20 }).notNull(),
  totalPoints: integer('total_points').notNull().default(0),
  matchesPlayed: integer('matches_played').notNull().default(0),
  matchesWon: integer('matches_won').notNull().default(0),
  rank: integer('rank'),
  previousRank: integer('previous_rank'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type Leaderboard = typeof leaderboardsTable.$inferSelect;
export type NewLeaderboard = typeof leaderboardsTable.$inferInsert;
