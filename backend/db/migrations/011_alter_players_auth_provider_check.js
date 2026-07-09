/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

// players_auth_provider_check is explicitly named in migration 001 (unlike
// migration 010's constraint, no naming guess needed here). Decision 084:
// guest is a real players row (authProvider='guest') until linked.

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.dropConstraint('players', 'players_auth_provider_check');
  pgm.addConstraint('players', 'players_auth_provider_check', {
    check: "auth_provider IN ('google', 'apple', 'guest')",
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropConstraint('players', 'players_auth_provider_check');
  pgm.addConstraint('players', 'players_auth_provider_check', {
    check: "auth_provider IN ('google', 'apple')",
  });
};
