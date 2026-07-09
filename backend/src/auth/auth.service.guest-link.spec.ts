import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { playersTable } from '../database/schema';
import { AuthService } from './auth.service';
import { makeAppleTokenService, makeTestDb, fakeConfig } from './test-helpers';

describe('AuthService — guest login, refresh, and provider linking', () => {
  let openClients: PGlite[] = [];

  afterEach(async () => {
    await Promise.all(openClients.map(c => c.close()));
    openClients = [];
  });

  async function makeAuthService() {
    const { db, client } = await makeTestDb();
    openClients.push(client);
    const jwtService = new JwtService({ secret: 'test-secret' });
    const configService = fakeConfig();
    const databaseService = { db } as unknown as import('../database/database.service').DatabaseService;
    const { service: appleTokenService, signToken } = await makeAppleTokenService(configService);
    const authService = new AuthService(jwtService, configService, databaseService, appleTokenService);
    return { authService, jwtService, db, signToken };
  }

  it('guest creation returns a usable token for a real guest player row', async () => {
    const { authService, jwtService, db } = await makeAuthService();

    const { access_token, refresh_token } = await authService.guestLogin();
    const decoded = jwtService.decode(access_token) as { sub: string };

    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, decoded.sub));
    expect(player.authProvider).toBe('guest');
    expect(typeof refresh_token).toBe('string');
    expect(refresh_token.length).toBeGreaterThan(0);
  });

  it('refresh reclaims the same player id and rotates the refresh token', async () => {
    const { authService, jwtService } = await makeAuthService();

    const first = await authService.guestLogin();
    const firstDecoded = jwtService.decode(first.access_token) as { sub: string };

    const second = await authService.refresh(first.refresh_token);
    const secondDecoded = jwtService.decode(second.access_token) as { sub: string };

    expect(secondDecoded.sub).toBe(firstDecoded.sub);
    expect(second.refresh_token).not.toBe(first.refresh_token);

    // the original token was rotated out — re-presenting it must fail
    await expect(authService.refresh(first.refresh_token)).rejects.toThrow();
  });

  it('link-in-place preserves player id and progress', async () => {
    const { authService, jwtService, db, signToken } = await makeAuthService();

    const { access_token } = await authService.guestLogin();
    const decoded = jwtService.decode(access_token) as { sub: string };

    await db.update(playersTable).set({ level: 5, xp: 1234, coins: 77 }).where(eq(playersTable.id, decoded.sub));

    const appleToken = await signToken('apple-real-id-1');
    await authService.linkProvider(decoded.sub, 'apple', appleToken);

    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, decoded.sub));
    expect(player.id).toBe(decoded.sub);
    expect(player.authProvider).toBe('apple');
    expect(player.providerId).toBe('apple-real-id-1');
    expect(player.level).toBe(5);
    expect(player.xp).toBe(1234);
    expect(player.coins).toBe(77);
  });

  it('rejects linking a provider identity already linked to a different player', async () => {
    const { authService, jwtService, db, signToken } = await makeAuthService();

    await db.insert(playersTable).values({
      username: 'ExistingApple',
      authProvider: 'apple',
      providerId: 'shared-apple-id',
      providerUsername: 'ExistingApple',
      status: 'active',
    });

    const { access_token } = await authService.guestLogin();
    const decoded = jwtService.decode(access_token) as { sub: string };

    const appleToken = await signToken('shared-apple-id');
    await expect(authService.linkProvider(decoded.sub, 'apple', appleToken)).rejects.toThrow();

    const [guestPlayer] = await db.select().from(playersTable).where(eq(playersTable.id, decoded.sub));
    expect(guestPlayer.authProvider).toBe('guest');
  });

  it('a guest cannot link twice', async () => {
    const { authService, jwtService, signToken } = await makeAuthService();

    const { access_token } = await authService.guestLogin();
    const decoded = jwtService.decode(access_token) as { sub: string };

    const firstToken = await signToken('apple-id-a');
    await authService.linkProvider(decoded.sub, 'apple', firstToken);

    const secondToken = await signToken('apple-id-b');
    await expect(authService.linkProvider(decoded.sub, 'apple', secondToken)).rejects.toThrow();
  });

  it('rejects a malformed/unverifiable provider token with a clean error, not a crash', async () => {
    const { authService, jwtService } = await makeAuthService();

    const { access_token } = await authService.guestLogin();
    const decoded = jwtService.decode(access_token) as { sub: string };

    await expect(authService.linkProvider(decoded.sub, 'apple', 'not-a-real-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
