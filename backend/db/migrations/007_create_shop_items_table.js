/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createTable('shop_items', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
      comment: 'Unique identifier for the shop item',
    },
    name: {
      type: 'varchar(100)',
      unique: true,
      notNull: true,
      comment: 'Display name of the item shown in shop UI',
    },
    description: {
      type: 'text',
      notNull: false,
      comment: 'Optional description of the item shown to player before purchase',
    },
    type: {
      type: 'varchar(30)',
      notNull: true,
      comment: 'Category of shop item: gem_package or coin_package',
    },
    currency: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'Currency used to purchase this item: real_money for IAP, gems for in-game purchase',
    },
    price: {
      type: 'integer',
      notNull: true,
      comment: 'Cost in currency units; cents for real_money (e.g. 99 means $0.99), gem amount for gems currency',
    },
    reward_type: {
      type: 'varchar(20)',
      notNull: true,
      comment: 'Type of reward player receives: gems or coins',
    },
    reward_amount: {
      type: 'integer',
      notNull: true,
      comment: 'Amount of reward player receives after successful purchase',
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Whether this item is available in the shop; false means hidden',
    },
    is_featured: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Whether this item is featured prominently in the shop UI',
    },
    sort_order: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Display order in shop UI; lower number appears first',
    },
    store_product_id: {
      type: 'varchar(255)',
      notNull: false,
      comment: 'Apple App Store or Google Play IAP product identifier; only set for real_money purchases',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
      comment: 'When this shop item was created',
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('now()'),
      comment: 'Last time this shop item was updated',
    },
  });

  // Indexes
  pgm.createIndex('shop_items', 'type');
  pgm.createIndex('shop_items', 'currency');
  pgm.createIndex('shop_items', 'is_active');
  pgm.createIndex('shop_items', 'is_featured');
  pgm.createIndex('shop_items', 'sort_order');

  // Check constraints
  pgm.addConstraint(
    'shop_items',
    'shop_items_type_check',
    `type IN ('gem_package', 'coin_package')`
  );
  pgm.addConstraint(
    'shop_items',
    'shop_items_currency_check',
    `currency IN ('real_money', 'gems')`
  );
  pgm.addConstraint(
    'shop_items',
    'shop_items_reward_type_check',
    `reward_type IN ('gems', 'coins')`
  );
  pgm.addConstraint('shop_items', 'shop_items_price_check', 'price > 0');
  pgm.addConstraint('shop_items', 'shop_items_reward_amount_check', 'reward_amount > 0');
  pgm.addConstraint('shop_items', 'shop_items_sort_order_check', 'sort_order >= 0');

  // store_product_id must be set for real money purchases
  pgm.addConstraint(
    'shop_items',
    'shop_items_store_product_id_required_check',
    `currency != 'real_money' OR store_product_id IS NOT NULL`
  );

  // gem_package must use real_money currency and reward gems
  pgm.addConstraint(
    'shop_items',
    'shop_items_gem_package_currency_check',
    `type != 'gem_package' OR currency = 'real_money'`
  );
  pgm.addConstraint(
    'shop_items',
    'shop_items_gem_package_reward_check',
    `type != 'gem_package' OR reward_type = 'gems'`
  );

  // coin_package must use gems currency and reward coins
  pgm.addConstraint(
    'shop_items',
    'shop_items_coin_package_currency_check',
    `type != 'coin_package' OR currency = 'gems'`
  );
  pgm.addConstraint(
    'shop_items',
    'shop_items_coin_package_reward_check',
    `type != 'coin_package' OR reward_type = 'coins'`
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable('shop_items');
};
