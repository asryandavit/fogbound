/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('maps', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
      comment: 'Unique identifier for the map',
    },
    name: {
      type: 'varchar(100)',
      unique: true,
      notNull: true,
      comment: 'Display name of the map shown in UI',
    },
    slug: {
      type: 'varchar(100)',
      unique: true,
      notNull: true,
      comment: 'URL-friendly version of name, e.g. jungle-crown',
    },
    grid_rows: {
      type: 'integer',
      notNull: true,
      comment: 'Number of rows in the grid, e.g. 7, 9, 11, 13, 15, 17',
    },
    grid_cols: {
      type: 'integer',
      notNull: true,
      comment: 'Number of columns in the grid, e.g. 7, 9, 11, 13, 15, 17',
    },
    min_players: {
      type: 'integer',
      notNull: true,
      default: 2,
      comment: 'Minimum players required to start a match',
    },
    max_players: {
      type: 'integer',
      notNull: true,
      default: 4,
      comment: 'Maximum players allowed in a match',
    },
    explorers_per_player: {
      type: 'integer',
      notNull: true,
      comment: 'Number of explorers each player controls: 1 for small maps, 2 for medium, 3 for large',
    },
    base_type: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'Type of base vehicle on this map, e.g. ship, train, car, airplane',
    },
    win_condition: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'How the match ends: time_limit, all_treasure, or points_target',
    },
    turn_timer_seconds: {
      type: 'integer',
      notNull: true,
      comment: 'Seconds each player has per turn, configurable per map and difficulty',
    },
    points_target: {
      type: 'integer',
      notNull: false,
      comment: 'Points needed to trigger win condition; only used when win_condition is points_target',
    },
    terrain_config: {
      type: 'jsonb',
      notNull: true,
      comment: 'Terrain distribution percentages, e.g. {"grass":0.3,"jungle":0.2,"sand":0.2,"water":0.1,"ice":0.1,"desert":0.1}',
    },
    treasure_config: {
      type: 'jsonb',
      notNull: true,
      comment: 'Treasure counts for this map, e.g. {"gems":18,"coins":35,"legendary":1}',
    },
    tile_pool: {
      type: 'jsonb',
      notNull: true,
      comment: 'List of tile types available in this map; controls which tiles can appear during play',
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Whether this map is active and available for players to select',
    },
    is_premium: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Whether this map requires purchase to unlock',
    },
    tier: {
      type: 'integer',
      notNull: true,
      default: 1,
      comment: 'Content release tier 1, 2, or 3; controls when map becomes available',
    },
  });

  // Indexes
  pgm.createIndex('maps', 'slug');
  pgm.createIndex('maps', 'win_condition');
  pgm.createIndex('maps', 'is_active');
  pgm.createIndex('maps', 'is_premium');
  pgm.createIndex('maps', 'tier');

  // Check constraints
  pgm.addConstraint(
    'maps',
    'maps_grid_rows_check',
    { check: 'grid_rows IN (7, 9, 11, 13, 15, 17)' }
  );
  pgm.addConstraint(
    'maps',
    'maps_grid_cols_check',
    { check: 'grid_cols IN (7, 9, 11, 13, 15, 17)' }
  );
  pgm.addConstraint(
    'maps',
    'maps_min_players_check',
    { check: 'min_players >= 2' }
  );
  pgm.addConstraint(
    'maps',
    'maps_max_players_check',
    { check: 'max_players <= 4' }
  );
  pgm.addConstraint(
    'maps',
    'maps_player_range_check',
    { check: 'min_players <= max_players' }
  );
  pgm.addConstraint(
    'maps',
    'maps_explorers_per_player_check',
    { check: 'explorers_per_player IN (1, 2, 3)' }
  );
  pgm.addConstraint(
    'maps',
    'maps_win_condition_check',
    { check: `win_condition IN ('time_limit', 'all_treasure', 'points_target')` }
  );
  pgm.addConstraint(
    'maps',
    'maps_turn_timer_seconds_check',
    { check: 'turn_timer_seconds > 0' }
  );
  pgm.addConstraint(
    'maps',
    'maps_points_target_check',
    { check: 'points_target IS NULL OR points_target > 0' }
  );
  pgm.addConstraint(
    'maps',
    'maps_points_target_required_check',
    { check: `win_condition != 'points_target' OR points_target IS NOT NULL` }
  );
  pgm.addConstraint('maps', 'maps_tier_check', { check: 'tier IN (1, 2, 3)' });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('maps');
};
