/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

// players_provider_id_key is Postgres's default auto-generated name for the
// single-column UNIQUE from migration 001's inline `provider_id: { unique: true }`
// (no explicit constraint name was given there) — confirmed by reading
// node-pg-migrate v8.0.4's own source, which emits bare `UNIQUE` with no
// CONSTRAINT clause for that column option, so Postgres's own
// `<table>_<column>_key` default naming applies. See Decision 085: identity
// is scoped by (auth_provider, provider_id) together, never provider_id alone
// (backend/src/auth/auth.service.spec.ts covers the account-takeover this
// closes). Deliberately no `ifExists: true` on dropConstraint below — if the
// name guess were wrong, that would make the drop a silent no-op while the
// old single-column constraint kept quietly enforcing.

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.dropConstraint('players', 'players_provider_id_key');
  pgm.addConstraint('players', 'players_auth_provider_provider_id_key', {
    unique: ['auth_provider', 'provider_id'],
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropConstraint('players', 'players_auth_provider_provider_id_key');
  pgm.addConstraint('players', 'players_provider_id_key', {
    unique: 'provider_id',
  });
};
