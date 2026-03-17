/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('leaderboards', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
      comment: 'Unique identifier for leaderboard entry',
    },
    player_id: {
      type: 'uuid',
      notNull: true,
      references: '"players"',
      referencesConstraintName: 'leaderboards_player_id_fkey',
      onDelete: 'CASCADE',
      comment: 'Reference to the player this entry belongs to',
    },
    map_id: {
      type: 'uuid',
      notNull: false,
      references: '"maps"',
      referencesConstraintName: 'leaderboards_map_id_fkey',
      onDelete: 'CASCADE',
      comment: 'Reference to map for map-scoped leaderboard; null means this is a global leaderboard entry',
    },
    scope: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'Type of leaderboard: global or map',
    },
    total_points: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Total ranking points accumulated across all matches in this scope',
    },
    matches_played: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Total matches played in this scope',
    },
    matches_won: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Total matches won in this scope',
    },
    rank: {
      type: 'integer',
      notNull: false,
      comment: 'Current rank position in this leaderboard; recalculated periodically after matches complete',
    },
    previous_rank: {
      type: 'integer',
      notNull: false,
      comment: 'Rank before last recalculation; used to show rank change arrows in UI',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
      comment: 'When this leaderboard entry was created',
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
      comment: 'Last time this entry was updated',
    },
  });

  // Indexes
  pgm.createIndex('leaderboards', 'player_id');
  pgm.createIndex('leaderboards', 'map_id');
  pgm.createIndex('leaderboards', 'scope');
  pgm.createIndex('leaderboards', 'total_points');
  pgm.createIndex('leaderboards', 'rank');

  // Unique constraint: one row per player per scope per map_id.
  // Standard unique constraints treat NULLs as distinct, so two partial
  // unique indexes are used to correctly enforce uniqueness in both cases.
  pgm.createIndex('leaderboards', ['player_id', 'scope'], {
    unique: true,
    where: 'map_id IS NULL',
    name: 'leaderboards_player_scope_global_unique',
  });
  pgm.createIndex('leaderboards', ['player_id', 'scope', 'map_id'], {
    unique: true,
    where: 'map_id IS NOT NULL',
    name: 'leaderboards_player_scope_map_unique',
  });

  // Check constraints
  pgm.addConstraint(
    'leaderboards',
    'leaderboards_scope_check',
    `scope IN ('global', 'map')`
  );
  pgm.addConstraint('leaderboards', 'leaderboards_total_points_check', 'total_points >= 0');
  pgm.addConstraint('leaderboards', 'leaderboards_matches_played_check', 'matches_played >= 0');
  pgm.addConstraint('leaderboards', 'leaderboards_matches_won_check', 'matches_won >= 0');
  pgm.addConstraint(
    'leaderboards',
    'leaderboards_matches_consistency_check',
    'matches_won <= matches_played'
  );
  pgm.addConstraint(
    'leaderboards',
    'leaderboards_rank_check',
    'rank IS NULL OR rank > 0'
  );
  pgm.addConstraint(
    'leaderboards',
    'leaderboards_previous_rank_check',
    'previous_rank IS NULL OR previous_rank > 0'
  );
  pgm.addConstraint(
    'leaderboards',
    'leaderboards_map_scope_map_id_check',
    `scope != 'map' OR map_id IS NOT NULL`
  );
  pgm.addConstraint(
    'leaderboards',
    'leaderboards_global_scope_map_id_check',
    `scope != 'global' OR map_id IS NULL`
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('leaderboards');
};
