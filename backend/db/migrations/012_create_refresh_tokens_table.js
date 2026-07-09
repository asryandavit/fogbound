/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('refresh_tokens', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
      comment: 'Unique identifier for this refresh token',
    },
    player_id: {
      type: 'uuid',
      notNull: true,
      references: '"players"',
      referencesConstraintName: 'refresh_tokens_player_id_fkey',
      onDelete: 'CASCADE',
      comment: 'Player this refresh token belongs to',
    },
    token_hash: {
      type: 'varchar(64)',
      notNull: true,
      unique: true,
      comment: 'SHA-256 hex digest of the raw token — the raw value is never stored',
    },
    expires_at: {
      type: 'timestamp with time zone',
      notNull: true,
      comment: 'Token becomes invalid after this time',
    },
    revoked_at: {
      type: 'timestamp with time zone',
      comment: 'Set when rotated or explicitly revoked; null means still valid',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
      comment: 'When this token was issued',
    },
  });

  pgm.createIndex('refresh_tokens', 'player_id');
  pgm.createIndex('refresh_tokens', 'token_hash');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('refresh_tokens');
};
