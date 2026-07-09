import { ConfigService } from '@nestjs/config';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { pushSchema } from 'drizzle-kit/api';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT, type JWK } from 'jose';
import * as schema from '../database/schema';
import { AppleTokenService } from './apple-token.service';

export const APPLE_AUDIENCE = 'com.fogbound.app';
export const APPLE_ISSUER = 'https://appleid.apple.com';

export async function makeAppleTokenService(configService: ConfigService) {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = (await exportJWK(publicKey)) as JWK;
  jwk.kid = 'test-key-1';
  const service = new AppleTokenService(configService);
  service.useJwksForTesting(createLocalJWKSet({ keys: [jwk] }));
  const signToken = (sub: string) =>
    new SignJWT({ sub, iss: APPLE_ISSUER, aud: APPLE_AUDIENCE })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
  return { service, signToken };
}

// Real (in-memory) Postgres-compatible DB via pglite, schema pushed straight
// from the actual Drizzle definitions (drizzle-kit's pushSchema) rather than
// hand-transcribed DDL — so tests can never silently drift from what
// players.schema.ts actually declares. Requires Node's --experimental-vm-modules
// (see package.json's "test" script) — pglite's WASM loading needs it.
export async function makeTestDb() {
  const client = new PGlite();
  // pushSchema's declared signature wants a schema-less PgDatabase; the
  // schema-typed instance below (used for actual queries) doesn't
  // structurally match it. Same underlying client, two typed views.
  const { apply } = await pushSchema(schema, drizzle(client));
  await apply();
  const db = drizzle(client, { schema });
  return { db, client };
}

export function fakeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = { APPLE_CLIENT_ID: APPLE_AUDIENCE, ...overrides };
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}
