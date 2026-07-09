import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { pushSchema } from 'drizzle-kit/api';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT, type JWK } from 'jose';
import * as schema from '../database/schema';
import { playersTable } from '../database/schema';
import { AuthService } from './auth.service';
import { AppleTokenService } from './apple-token.service';

const APPLE_AUDIENCE = 'com.fogbound.app';
const APPLE_ISSUER = 'https://appleid.apple.com';

async function makeAppleTokenService(configService: ConfigService) {
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
// hand-transcribed DDL — so this test can never silently drift from what
// players.schema.ts actually declares. Requires Node's --experimental-vm-modules
// (see package.json's "test" script) — pglite's WASM loading needs it.
async function makeTestDb() {
  const client = new PGlite();
  // pushSchema's declared signature wants a schema-less PgDatabase; the
  // schema-typed instance below (used for actual queries) doesn't
  // structurally match it. Same underlying client, two typed views.
  const { apply } = await pushSchema(schema, drizzle(client));
  await apply();
  const db = drizzle(client, { schema });
  return { db, client };
}

function fakeConfig(): ConfigService {
  return { get: (key: string) => (key === 'APPLE_CLIENT_ID' ? APPLE_AUDIENCE : undefined) } as unknown as ConfigService;
}

describe('AuthService.findOrCreatePlayer (via appleLogin/googleLogin)', () => {
  let openClients: PGlite[] = [];

  afterEach(async () => {
    await Promise.all(openClients.map(c => c.close()));
    openClients = [];
  });

  it('an Apple login cannot be matched to an existing Google player carrying the same providerId', async () => {
    const { db, client } = await makeTestDb();
    openClients.push(client);
    const jwtService = new JwtService({ secret: 'test-secret' });
    const configService = fakeConfig();
    const databaseService = { db } as unknown as import('../database/database.service').DatabaseService;
    const { service: appleTokenService, signToken } = await makeAppleTokenService(configService);

    const [googlePlayer] = await db
      .insert(playersTable)
      .values({
        username: 'GoogleUser',
        authProvider: 'google',
        providerId: 'shared-id-123',
        providerUsername: 'GoogleUser',
        status: 'active',
      })
      .returning();

    const authService = new AuthService(jwtService, configService, databaseService, appleTokenService);

    // A legitimately-signed Apple token carrying the SAME providerId as the
    // existing Google player — the real question this test guards: does the
    // DB lookup scope by provider, not just "is the token real."
    const token = await signToken('shared-id-123');

    const { access_token } = await authService.appleLogin(token, 'AppleUser');
    const decoded = jwtService.decode(access_token) as { sub: string };

    expect(decoded.sub).not.toBe(googlePlayer.id);
  });

  it('the composite (authProvider, providerId) UNIQUE constraint rejects a true duplicate', async () => {
    const { db, client } = await makeTestDb();
    openClients.push(client);

    await db.insert(playersTable).values({
      username: 'PlayerOne',
      authProvider: 'google',
      providerId: 'dup-id',
      providerUsername: 'PlayerOne',
      status: 'active',
    });

    await expect(
      db.insert(playersTable).values({
        username: 'PlayerTwo',
        authProvider: 'google',
        providerId: 'dup-id',
        providerUsername: 'PlayerTwo',
        status: 'active',
      }),
    ).rejects.toThrow();
  });
});
