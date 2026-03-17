/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('player_inventory', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
      comment: 'Unique identifier for this inventory record',
    },
    player_id: {
      type: 'uuid',
      notNull: true,
      references: '"players"',
      referencesConstraintName: 'player_inventory_player_id_fkey',
      onDelete: 'CASCADE',
      comment: 'Reference to the player who owns this item',
    },
    shop_item_id: {
      type: 'uuid',
      notNull: true,
      references: '"shop_items"',
      referencesConstraintName: 'player_inventory_shop_item_id_fkey',
      onDelete: 'RESTRICT',
      comment: 'Reference to the purchased shop item; restrict prevents deleting shop items that players already own',
    },
    purchased_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
      comment: 'When the player purchased this item',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
      comment: 'When this inventory record was created',
    },
  });

  // Indexes
  pgm.createIndex('player_inventory', 'player_id');
  pgm.createIndex('player_inventory', 'shop_item_id');

  // Unique constraint: prevents player from owning same item twice
  pgm.addConstraint(
    'player_inventory',
    'player_inventory_player_item_unique',
    'UNIQUE (player_id, shop_item_id)'
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('player_inventory');
};
