import { pgTable, uuid, integer, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { playersTable } from './players.schema';

export const playerStatsTable = pgTable('player_stats', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  playerId: uuid('player_id')
    .notNull()
    .references(() => playersTable.id),
  matchesPlayed: integer('matches_played').notNull().default(0),
  matchesWon: integer('matches_won').notNull().default(0),
  matchesLost: integer('matches_lost').notNull().default(0),
  totalPlaytime: integer('total_playtime').notNull().default(0),
  totalTreasure: integer('total_treasure').notNull().default(0),
  totalKills: integer('total_kills').notNull().default(0),
  totalDeaths: integer('total_deaths').notNull().default(0),
  highestScore: integer('highest_score').notNull().default(0),
  winStreak: integer('win_streak').notNull().default(0),
  bestWinStreak: integer('best_win_streak').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type PlayerStats = typeof playerStatsTable.$inferSelect;
export type NewPlayerStats = typeof playerStatsTable.$inferInsert;
