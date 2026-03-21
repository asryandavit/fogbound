import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { matchesTable } from './matches.schema';
import { playersTable } from './players.schema';

export const matchPlayersTable = pgTable('match_players', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  matchId: uuid('match_id')
    .notNull()
    .references(() => matchesTable.id),
  playerId: uuid('player_id').references(() => playersTable.id),
  slotNumber: integer('slot_number').notNull(),
  teamColor: varchar('team_color', { length: 20 }).notNull(),
  basePosition: integer('base_position').notNull(),
  isBot: boolean('is_bot').notNull().default(false),
  botDifficulty: varchar('bot_difficulty', { length: 20 }),
  wasReplaced: boolean('was_replaced').notNull().default(false),
  replacedAtTurn: integer('replaced_at_turn'),
  finalScore: integer('final_score').notNull().default(0),
  gemsCollected: integer('gems_collected').notNull().default(0),
  coinsCollected: integer('coins_collected').notNull().default(0),
  kills: integer('kills').notNull().default(0),
  deaths: integer('deaths').notNull().default(0),
  treasuresBanked: integer('treasures_banked').notNull().default(0),
  result: varchar('result', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type MatchPlayer = typeof matchPlayersTable.$inferSelect;
export type NewMatchPlayer = typeof matchPlayersTable.$inferInsert;
