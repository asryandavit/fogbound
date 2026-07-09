import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { playersTable, refreshTokensTable, NewPlayer, Player } from '../database/schema';
import { and, eq } from 'drizzle-orm';
import { AppleTokenService } from './apple-token.service';

const REFRESH_TOKEN_BYTES = 32;

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly appleTokenService: AppleTokenService,
  ) {
    this.googleClient = new OAuth2Client(
      configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  private generateToken(
    playerId: string,
    username: string,
  ): { access_token: string } {
    return {
      access_token: this.jwtService.sign({ sub: playerId, username }),
    };
  }

  private async issueRefreshToken(playerId: string): Promise<string> {
    const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const ttlDays = Number(this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN_DAYS') ?? 90);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.databaseService.db.insert(refreshTokensTable).values({
      playerId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    });

    return rawToken;
  }

  private async findOrCreatePlayer(
    providerId: string,
    authProvider: 'google' | 'apple',
    username: string,
    avatarUrl?: string,
  ) {
    const db = this.databaseService.db;

    const existing = await db
      .select()
      .from(playersTable)
      .where(and(eq(playersTable.authProvider, authProvider), eq(playersTable.providerId, providerId)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const newPlayer: NewPlayer = {
      username: username.slice(0, 30),
      authProvider,
      providerId,
      providerUsername: username,
      avatarUrl: avatarUrl ?? null,
      status: 'active',
    };

    const created = await db.insert(playersTable).values(newPlayer).returning();

    return created[0];
  }

  private async verifyGoogleToken(
    token: string,
  ): Promise<{ providerId: string; name: string; avatarUrl?: string }> {
    let payload: { sub?: string; name?: string; picture?: string } | null =
      null;

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      payload = ticket.getPayload() as {
        sub?: string;
        name?: string;
        picture?: string;
      };
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid Google token payload');
    }

    return { providerId: payload.sub, name: payload.name ?? 'Google User', avatarUrl: payload.picture };
  }

  async googleLogin(token: string): Promise<{ access_token: string }> {
    const { providerId, name, avatarUrl } = await this.verifyGoogleToken(token);
    const player = await this.findOrCreatePlayer(providerId, 'google', name, avatarUrl);
    return this.generateToken(player.id, player.username);
  }

  async guestLogin(): Promise<{ access_token: string; refresh_token: string }> {
    const providerId = randomUUID();
    const username = `Guest_${providerId.slice(0, 8)}`;

    const [player] = await this.databaseService.db
      .insert(playersTable)
      .values({
        username,
        authProvider: 'guest',
        providerId,
        status: 'active',
      })
      .returning();

    const { access_token } = this.generateToken(player.id, player.username);
    const refresh_token = await this.issueRefreshToken(player.id);
    return { access_token, refresh_token };
  }

  async refresh(rawToken: string): Promise<{ access_token: string; refresh_token: string }> {
    const db = this.databaseService.db;
    const tokenHash = hashToken(rawToken);

    const [existing] = await db
      .select()
      .from(refreshTokensTable)
      .where(eq(refreshTokensTable.tokenHash, tokenHash))
      .limit(1);

    const isValid = existing && existing.revokedAt === null && existing.expiresAt.getTime() > Date.now();
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, existing.playerId)).limit(1);
    if (!player) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: the presented token is single-use — revoke it before issuing a
    // fresh one, so a leaked-but-unused token can't be replayed after this.
    await db.update(refreshTokensTable).set({ revokedAt: new Date() }).where(eq(refreshTokensTable.id, existing.id));

    const { access_token } = this.generateToken(player.id, player.username);
    const refresh_token = await this.issueRefreshToken(player.id);
    return { access_token, refresh_token };
  }

  async linkProvider(
    playerId: string,
    provider: 'google' | 'apple',
    token: string,
    fullName?: string,
  ): Promise<{ access_token: string }> {
    const db = this.databaseService.db;

    const [current] = await db.select().from(playersTable).where(eq(playersTable.id, playerId)).limit(1);
    if (!current || current.authProvider !== 'guest') {
      throw new ConflictException('Only a guest account can be linked to a provider');
    }

    let verified: { providerId: string; name: string; avatarUrl?: string };
    if (provider === 'apple') {
      try {
        verified = { providerId: await this.appleTokenService.verify(token), name: fullName ?? 'Apple User', avatarUrl: undefined };
      } catch {
        throw new UnauthorizedException('Invalid Apple token');
      }
    } else {
      verified = await this.verifyGoogleToken(token);
    }

    const [conflict] = await db
      .select()
      .from(playersTable)
      .where(and(eq(playersTable.authProvider, provider), eq(playersTable.providerId, verified.providerId)))
      .limit(1);
    if (conflict && conflict.id !== playerId) {
      throw new ConflictException(`This ${provider} account is already linked to another player`);
    }

    let updated: Player | undefined;
    try {
      [updated] = await db
        .update(playersTable)
        .set({
          authProvider: provider,
          providerId: verified.providerId,
          providerUsername: verified.name,
          avatarUrl: verified.avatarUrl ?? current.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(playersTable.id, playerId))
        .returning();
    } catch (err) {
      // Authoritative backstop against the race window between the SELECT
      // above and this UPDATE (two devices linking the same identity at
      // once): the composite UNIQUE constraint (migration 010) is what
      // actually prevents the collision — this just gives it the same
      // error shape as the fast-path check above.
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException(`This ${provider} account is already linked to another player`);
      }
      throw err;
    }

    return this.generateToken(updated!.id, updated!.username);
  }

  async appleLogin(
    token: string,
    fullName?: string,
  ): Promise<{ access_token: string }> {
    let providerId: string;

    try {
      providerId = await this.appleTokenService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid Apple token');
    }

    const username = fullName ?? 'Apple User';
    const player = await this.findOrCreatePlayer(providerId, 'apple', username);

    return this.generateToken(player.id, player.username);
  }
}
