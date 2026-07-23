import { ConfigService } from '@nestjs/config';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
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

// Real (in-memory) Postgres-compatible DB via pglite, DDL generated straight
// from the actual Drizzle ORM schema definitions — so tests can never silently
// drift from what the schema files declare. generateDrizzleJson derives a
// schema snapshot from the ORM objects (no DB connection needed); generateMigration
// diffs it against an empty baseline to produce pure CREATE TABLE SQL that is
// executed directly on PGlite. This replaces pushSchema (drizzle-kit@0.31
// changed pushSchema to introspect the target DB first, calling process.exit
// on failure, which crashed the Jest worker before any test ran — Decision 095).
export async function makeTestDb() {
  const client = new PGlite();
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
  for (const stmt of statements) {
    await client.exec(stmt);
  }
  const db = drizzle(client, { schema });
  return { db, client };
}

export function fakeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = { APPLE_CLIENT_ID: APPLE_AUDIENCE, ...overrides };
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}
