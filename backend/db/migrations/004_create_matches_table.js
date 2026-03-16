/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('matches', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
      comment: 'Unique identifier for the match',
    },
    map_id: {
      type: 'uuid',
      notNull: true,
      references: '"maps"',
      referencesConstraintName: 'matches_map_id_fkey',
      onDelete: 'RESTRICT',
      comment: 'Reference to the map being played',
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'pending',
      comment: 'Current state of the match: pending, in_progress, completed, or abandoned',
    },
    win_condition: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'Copy of win condition from map at match start, preserved in case map config changes later',
    },
    turn_timer_seconds: {
      type: 'integer',
      notNull: true,
      comment: 'Copy of turn timer from map at match start, preserved in case map config changes later',
    },
    points_target: {
      type: 'integer',
      notNull: false,
      comment: 'Points target copied from map at match start; only set when win_condition is points_target',
    },
    board_state: {
      type: 'jsonb',
      notNull: false,
      comment: 'Full board snapshot updated every turn; includes all tile states, explorer positions, and treasure locations. Used for reconnection recovery',
    },
    current_turn: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Current turn number in the match',
    },
    current_player_id: {
      type: 'uuid',
      notNull: false,
      references: '"players"',
      referencesConstraintName: 'matches_current_player_id_fkey',
      onDelete: 'SET NULL',
      comment: 'Player whose turn it currently is',
    },
    human_player_count: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Number of human players still active; when this reaches 0 match ends immediately as all players have been replaced by bots',
    },
    started_at: {
      type: 'timestamp with time zone',
      notNull: false,
      comment: 'When the match actually started; null means match is still in pending state',
    },
    ended_at: {
      type: 'timestamp with time zone',
      notNull: false,
      comment: 'When the match ended; null means match is still in progress',
    },
    duration_seconds: {
      type: 'integer',
      notNull: false,
      comment: 'Total match duration in seconds; calculated when match ends',
    },
    winner_id: {
      type: 'uuid',
      notNull: false,
      references: '"players"',
      referencesConstraintName: 'matches_winner_id_fkey',
      onDelete: 'SET NULL',
      comment: 'Player who won the match; null if match was abandoned or still in progress',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
      comment: 'When the match record was created',
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
      comment: 'Last time match record was updated',
    },
  });

  // Indexes
  pgm.createIndex('matches', 'status');
  pgm.createIndex('matches', 'map_id');
  pgm.createIndex('matches', 'winner_id');
  pgm.createIndex('matches', 'current_player_id');
  pgm.createIndex('matches', 'started_at');

  // Check constraints
  pgm.addConstraint(
    'matches',
    'matches_status_check',
    `status IN ('pending', 'in_progress', 'completed', 'abandoned')`
  );
  pgm.addConstraint(
    'matches',
    'matches_win_condition_check',
    `win_condition IN ('time_limit', 'all_treasure', 'points_target')`
  );
  pgm.addConstraint(
    'matches',
    'matches_current_turn_check',
    'current_turn >= 0'
  );
  pgm.addConstraint(
    'matches',
    'matches_human_player_count_check',
    'human_player_count >= 0'
  );
  pgm.addConstraint(
    'matches',
    'matches_duration_seconds_check',
    'duration_seconds IS NULL OR duration_seconds > 0'
  );
  pgm.addConstraint(
    'matches',
    'matches_points_target_check',
    'points_target IS NULL OR points_target > 0'
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('matches');
};
