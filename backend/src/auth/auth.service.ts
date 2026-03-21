import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { DatabaseService } from '../database/database.service';
import { playersTable, NewPlayer } from '../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
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
      .where(eq(playersTable.providerId, providerId))
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

  async googleLogin(token: string): Promise<{ access_token: string }> {
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

    const player = await this.findOrCreatePlayer(
      payload.sub,
      'google',
      payload.name ?? 'Google User',
      payload.picture,
    );

    return this.generateToken(player.id, player.username);
  }

  async appleLogin(
    token: string,
    fullName?: string,
  ): Promise<{ access_token: string }> {
    let providerId: string;

    try {
      const parts = token.split('.');
      const decoded = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf8'),
      ) as { sub?: string };
      if (!decoded.sub) throw new Error('Missing sub');
      providerId = decoded.sub;
    } catch {
      throw new UnauthorizedException('Invalid Apple token');
    }

    const username = fullName ?? 'Apple User';
    const player = await this.findOrCreatePlayer(providerId, 'apple', username);

    return this.generateToken(player.id, player.username);
  }
}
