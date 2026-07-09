import { ConfigService } from '@nestjs/config';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT, type JWK } from 'jose';
import { AppleTokenService } from './apple-token.service';

const AUDIENCE = 'com.fogbound.app';
const ISSUER = 'https://appleid.apple.com';
const KID = 'test-key-1';

function fakeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = { APPLE_CLIENT_ID: AUDIENCE, ...overrides };
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

async function makeKeyPair() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = (await exportJWK(publicKey)) as JWK;
  jwk.kid = KID;
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  return { privateKey, jwk };
}

async function signToken(
  privateKey: Parameters<SignJWT['sign']>[0],
  claims: Record<string, unknown>,
  opts: { kid?: string; expiresIn?: string } = {},
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: opts.kid ?? KID })
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? '1h')
    .sign(privateKey);
}

describe('AppleTokenService.verify', () => {
  it('accepts a validly signed token with correct iss/aud and returns sub', async () => {
    const { privateKey, jwk } = await makeKeyPair();
    const verifier = new AppleTokenService(fakeConfig());
    verifier.useJwksForTesting(createLocalJWKSet({ keys: [jwk] }));

    const token = await signToken(privateKey, { sub: 'apple-user-1', iss: ISSUER, aud: AUDIENCE });

    await expect(verifier.verify(token)).resolves.toBe('apple-user-1');
  });

  it('rejects a token signed with a key not in the JWKS (forged)', async () => {
    const { jwk } = await makeKeyPair();
    const { privateKey: forgedKey } = await generateKeyPair('RS256'); // different keypair
    const verifier = new AppleTokenService(fakeConfig());
    verifier.useJwksForTesting(createLocalJWKSet({ keys: [jwk] }));

    const token = await signToken(forgedKey, { sub: 'attacker', iss: ISSUER, aud: AUDIENCE });

    await expect(verifier.verify(token)).rejects.toThrow();
  });

  it('rejects a correctly signed token with the wrong audience', async () => {
    const { privateKey, jwk } = await makeKeyPair();
    const verifier = new AppleTokenService(fakeConfig());
    verifier.useJwksForTesting(createLocalJWKSet({ keys: [jwk] }));

    const token = await signToken(privateKey, { sub: 'apple-user-1', iss: ISSUER, aud: 'com.someone-else.app' });

    await expect(verifier.verify(token)).rejects.toThrow();
  });

  it('rejects a correctly signed token with the wrong issuer', async () => {
    const { privateKey, jwk } = await makeKeyPair();
    const verifier = new AppleTokenService(fakeConfig());
    verifier.useJwksForTesting(createLocalJWKSet({ keys: [jwk] }));

    const token = await signToken(privateKey, { sub: 'apple-user-1', iss: 'https://evil.example.com', aud: AUDIENCE });

    await expect(verifier.verify(token)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const { privateKey, jwk } = await makeKeyPair();
    const verifier = new AppleTokenService(fakeConfig());
    verifier.useJwksForTesting(createLocalJWKSet({ keys: [jwk] }));

    const token = await signToken(privateKey, { sub: 'apple-user-1', iss: ISSUER, aud: AUDIENCE }, { expiresIn: '-1h' });

    await expect(verifier.verify(token)).rejects.toThrow();
  });

  it('fails closed when APPLE_CLIENT_ID is not configured', async () => {
    const { privateKey, jwk } = await makeKeyPair();
    const verifier = new AppleTokenService(fakeConfig({ APPLE_CLIENT_ID: '' }));
    verifier.useJwksForTesting(createLocalJWKSet({ keys: [jwk] }));

    const token = await signToken(privateKey, { sub: 'apple-user-1', iss: ISSUER, aud: AUDIENCE });

    await expect(verifier.verify(token)).rejects.toThrow('APPLE_CLIENT_ID is not configured');
  });
});
