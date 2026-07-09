import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';

const APPLE_ISSUER = 'https://appleid.apple.com';

@Injectable()
export class AppleTokenService {
  private jwks: JWTVerifyGetKey;

  constructor(private readonly configService: ConfigService) {
    this.jwks = createRemoteJWKSet(new URL(`${APPLE_ISSUER}/auth/keys`));
  }

  // Test-only seam: swaps the JWKS source for a local, test-generated one so
  // tests get real signature verification without hitting the network.
  useJwksForTesting(jwks: JWTVerifyGetKey): void {
    this.jwks = jwks;
  }

  async verify(token: string): Promise<string> {
    const audience = this.configService.get<string>('APPLE_CLIENT_ID');
    if (!audience) throw new Error('APPLE_CLIENT_ID is not configured');

    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: APPLE_ISSUER,
      audience,
      algorithms: ['RS256'],
    });

    if (typeof payload.sub !== 'string') throw new Error('Missing sub claim');
    return payload.sub;
  }
}
