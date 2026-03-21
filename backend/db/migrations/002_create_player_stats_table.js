/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('player_stats', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    player_id: {
      type: 'uuid',
      notNull: true,
      references: '"players"',
      referencesConstraintName: 'player_stats_player_id_fkey',
      onDelete: 'CASCADE',
    },
    matches_played: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    matches_won: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    matches_lost: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    total_playtime: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'in minutes',
    },
    total_treasure: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    total_kills: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    total_deaths: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    highest_score: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    win_streak: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    best_win_streak: {
      type: 'integer',
      notNull: true,
      default: 0,
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

  // Unique index: one stats row per player
  pgm.createIndex('player_stats', 'player_id', { unique: true });

  // Check constraints: all integer stats must be >= 0
  pgm.addConstraint('player_stats', 'player_stats_matches_played_check', { check: 'matches_played >= 0' });
  pgm.addConstraint('player_stats', 'player_stats_matches_won_check', { check: 'matches_won >= 0' });
  pgm.addConstraint('player_stats', 'player_stats_matches_lost_check', { check: 'matches_lost >= 0' });
  pgm.addConstraint('player_stats', 'player_stats_total_playtime_check', { check: 'total_playtime >= 0' });
  pgm.addConstraint('player_stats', 'player_stats_total_treasure_check', { check: 'total_treasure >= 0' });
  pgm.addConstraint('player_stats', 'player_stats_total_kills_check', { check: 'total_kills >= 0' });
  pgm.addConstraint('player_stats', 'player_stats_total_deaths_check', { check: 'total_deaths >= 0' });
  pgm.addConstraint('player_stats', 'player_stats_highest_score_check', { check: 'highest_score >= 0' });
  pgm.addConstraint('player_stats', 'player_stats_win_streak_check', { check: 'win_streak >= 0' });
  pgm.addConstraint('player_stats', 'player_stats_best_win_streak_check', { check: 'best_win_streak >= 0' });

  // Check constraint: wins + losses cannot exceed total matches played
  pgm.addConstraint(
    'player_stats',
    'player_stats_matches_consistency_check',
    { check: 'matches_won + matches_lost <= matches_played' }
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('player_stats');
};
