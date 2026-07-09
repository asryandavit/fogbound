import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const playersTable = pgTable('players', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: varchar('username', { length: 30 }).unique().notNull(),
  avatarUrl: text('avatar_url'),
  authProvider: varchar('auth_provider', { length: 10 }).notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  providerUsername: varchar('provider_username', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  level: integer('level').notNull().default(1),
  xp: integer('xp').notNull().default(0),
  coins: integer('coins').notNull().default(0),
  gems: integer('gems').notNull().default(0),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
}, (table) => ({
  // Identity is (authProvider, providerId) together, never providerId alone
  // — see Decision 085. Mirrors migration 010's composite UNIQUE constraint.
  authProviderProviderIdUnique: uniqueIndex('players_auth_provider_provider_id_key')
    .on(table.authProvider, table.providerId),
}));

export type Player = typeof playersTable.$inferSelect;
export type NewPlayer = typeof playersTable.$inferInsert;
