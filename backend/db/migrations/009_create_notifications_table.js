/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('notifications', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
      comment: 'Unique identifier for this notification',
    },
    player_id: {
      type: 'uuid',
      notNull: true,
      references: '"players"',
      referencesConstraintName: 'notifications_player_id_fkey',
      onDelete: 'CASCADE',
      comment: 'Reference to the player this notification belongs to',
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'Category of notification: match_invite, match_result, purchase_complete, or system',
    },
    title: {
      type: 'varchar(100)',
      notNull: true,
      comment: 'Short notification title shown in push notification header',
    },
    body: {
      type: 'text',
      notNull: true,
      comment: 'Full notification message shown in push notification body',
    },
    data: {
      type: 'jsonb',
      notNull: false,
      comment: 'Optional extra payload for the notification, e.g. match_id or item_id; used by client to navigate on tap',
    },
    is_read: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Whether player has read this notification',
    },
    sent_at: {
      type: 'timestamp with time zone',
      notNull: false,
      comment: 'When notification was sent to player device; null means not yet sent',
    },
    read_at: {
      type: 'timestamp with time zone',
      notNull: false,
      comment: 'When player read the notification; null means unread',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
      comment: 'When this notification was created',
    },
  });

  // Indexes
  pgm.createIndex('notifications', 'player_id');
  pgm.createIndex('notifications', 'type');
  pgm.createIndex('notifications', 'is_read');
  pgm.createIndex('notifications', 'sent_at');

  // Check constraints
  pgm.addConstraint(
    'notifications',
    'notifications_type_check',
    { check: `type IN ('match_invite', 'match_result', 'purchase_complete', 'system')` }
  );
  // read_at must be null when is_read is false
  pgm.addConstraint(
    'notifications',
    'notifications_read_at_unread_check',
    { check: 'is_read = true OR read_at IS NULL' }
  );
  // read_at must not be null when is_read is true
  pgm.addConstraint(
    'notifications',
    'notifications_read_at_read_check',
    { check: 'is_read = false OR read_at IS NOT NULL' }
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('notifications');
};
