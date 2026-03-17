/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('match_players', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
      comment: 'Unique identifier for this match player record',
    },
    match_id: {
      type: 'uuid',
      notNull: true,
      references: '"matches"',
      referencesConstraintName: 'match_players_match_id_fkey',
      onDelete: 'CASCADE',
      comment: 'Reference to the match this record belongs to',
    },
    player_id: {
      type: 'uuid',
      notNull: false,
      references: '"players"',
      referencesConstraintName: 'match_players_player_id_fkey',
      onDelete: 'SET NULL',
      comment: 'Reference to the player; null if this is a bot with no player account',
    },
    slot_number: {
      type: 'integer',
      notNull: true,
      comment: 'Player position in the match: 1, 2, 3, or 4; determines starting corner on the board',
    },
    team_color: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'Visual color assigned to this player: red, blue, green, or yellow',
    },
    base_position: {
      type: 'integer',
      notNull: true,
      comment: 'Position where player placed their base along their side of the board at match start',
    },
    is_bot: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Whether this slot is controlled by a bot; true for AI players and replaced human players',
    },
    bot_difficulty: {
      type: 'varchar(20)',
      notNull: false,
      comment: 'Bot difficulty level when is_bot is true: easy, medium, or hard; null when human player',
    },
    was_replaced: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Whether a human player was replaced by a bot mid-match after 3 consecutive bot moves',
    },
    replaced_at_turn: {
      type: 'integer',
      notNull: false,
      comment: 'Turn number when human was replaced by bot; null if player was never replaced',
    },
    final_score: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Total score at end of match',
    },
    gems_collected: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Total gems banked at base during match',
    },
    coins_collected: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Total coins banked at base during match',
    },
    kills: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Number of opponents defeated in combat',
    },
    deaths: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Number of times this explorer was defeated',
    },
    treasures_banked: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Number of times player successfully returned treasure to their base',
    },
    result: {
      type: 'varchar(20)',
      notNull: false,
      comment: 'Match outcome for this player: won, lost, or abandoned; null if match is still in progress',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
      comment: 'When this match player record was created',
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
      comment: 'Last time this record was updated',
    },
  });

  // Indexes
  pgm.createIndex('match_players', 'match_id');
  pgm.createIndex('match_players', 'player_id');
  pgm.createIndex('match_players', 'is_bot');
  pgm.createIndex('match_players', 'result');

  // Unique constraints
  pgm.addConstraint('match_players', 'match_players_match_slot_unique', 'UNIQUE (match_id, slot_number)');
  pgm.addConstraint('match_players', 'match_players_match_color_unique', 'UNIQUE (match_id, team_color)');

  // Check constraints
  pgm.addConstraint('match_players', 'match_players_slot_number_check', 'slot_number IN (1, 2, 3, 4)');
  pgm.addConstraint(
    'match_players',
    'match_players_team_color_check',
    `team_color IN ('red', 'blue', 'green', 'yellow')`
  );
  pgm.addConstraint(
    'match_players',
    'match_players_bot_difficulty_check',
    `bot_difficulty IS NULL OR bot_difficulty IN ('easy', 'medium', 'hard')`
  );
  pgm.addConstraint(
    'match_players',
    'match_players_result_check',
    `result IS NULL OR result IN ('won', 'lost', 'abandoned')`
  );
  pgm.addConstraint('match_players', 'match_players_final_score_check', 'final_score >= 0');
  pgm.addConstraint('match_players', 'match_players_gems_collected_check', 'gems_collected >= 0');
  pgm.addConstraint('match_players', 'match_players_coins_collected_check', 'coins_collected >= 0');
  pgm.addConstraint('match_players', 'match_players_kills_check', 'kills >= 0');
  pgm.addConstraint('match_players', 'match_players_deaths_check', 'deaths >= 0');
  pgm.addConstraint('match_players', 'match_players_treasures_banked_check', 'treasures_banked >= 0');
  pgm.addConstraint(
    'match_players',
    'match_players_replaced_at_turn_check',
    'replaced_at_turn IS NULL OR replaced_at_turn > 0'
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('match_players');
};
