import {
  pgTable,
  uuid,
  varchar,
  integer,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { mapsTable } from './maps.schema';
import { playersTable } from './players.schema';

export const matchesTable = pgTable('matches', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  mapId: uuid('map_id')
    .notNull()
    .references(() => mapsTable.id),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  winCondition: varchar('win_condition', { length: 50 }).notNull(),
  turnTimerSeconds: integer('turn_timer_seconds').notNull(),
  pointsTarget: integer('points_target'),
  boardState: jsonb('board_state'),
  currentTurn: integer('current_turn').notNull().default(0),
  currentPlayerId: uuid('current_player_id').references(() => playersTable.id),
  humanPlayerCount: integer('human_player_count').notNull().default(0),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  durationSeconds: integer('duration_seconds'),
  winnerId: uuid('winner_id').references(() => playersTable.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type Match = typeof matchesTable.$inferSelect;
export type NewMatch = typeof matchesTable.$inferInsert;
