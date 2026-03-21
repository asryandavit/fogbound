/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('players', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    username: {
      type: 'varchar(30)',
      unique: true,
      notNull: true,
    },
    avatar_url: {
      type: 'text',
      notNull: false,
    },
    auth_provider: {
      type: 'varchar(10)',
      notNull: true,
    },
    provider_id: {
      type: 'varchar(255)',
      unique: true,
      notNull: true,
    },
    provider_username: {
      type: 'varchar(100)',
      notNull: false,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'active',
    },
    level: {
      type: 'integer',
      notNull: true,
      default: 1,
    },
    xp: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    coins: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    gems: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    last_seen_at: {
      type: 'timestamp with time zone',
      notNull: false,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Indexes
  pgm.createIndex('players', 'username');
  pgm.createIndex('players', 'provider_id');
  pgm.createIndex('players', 'status');

  // Check constraints
  pgm.addConstraint(
    'players',
    'players_status_check',
    { check: `status IN ('active', 'suspended', 'banned')` }
  );
  pgm.addConstraint(
    'players',
    'players_auth_provider_check',
    { check: `auth_provider IN ('google', 'apple')` }
  );
  pgm.addConstraint(
    'players',
    'players_level_check',
    { check: 'level > 0' }
  );
  pgm.addConstraint(
    'players',
    'players_xp_check',
    { check: 'xp >= 0' }
  );
  pgm.addConstraint(
    'players',
    'players_coins_check',
    { check: 'coins >= 0' }
  );
  pgm.addConstraint(
    'players',
    'players_gems_check',
    { check: 'gems >= 0' }
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('players');
};
