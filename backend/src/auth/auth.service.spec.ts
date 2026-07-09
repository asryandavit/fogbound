import { JwtService } from '@nestjs/jwt';
import { PGlite } from '@electric-sql/pglite';
import { playersTable } from '../database/schema';
import { AuthService } from './auth.service';
import { makeAppleTokenService, makeTestDb, fakeConfig } from './test-helpers';

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
