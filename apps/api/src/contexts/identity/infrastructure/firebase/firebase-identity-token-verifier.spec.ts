import type { DecodedIdToken } from 'firebase-admin/auth';
import {
  IdentityProviderUnavailableError,
  InvalidIdentityTokenError,
} from '../../application/errors/identity-errors.js';
import {
  FirebaseIdentityTokenVerifier,
  type FirebaseAuthClient,
} from './firebase-identity-token-verifier.js';

function decodedToken(overrides: Partial<DecodedIdToken> = {}): DecodedIdToken {
  return {
    aud: 'demo-fiapx',
    auth_time: 1,
    exp: 2,
    firebase: {
      identities: {},
      sign_in_provider: 'password',
    },
    iat: 1,
    iss: 'https://securetoken.google.com/demo-fiapx',
    sub: 'firebase-user',
    uid: 'firebase-user',
    ...overrides,
  };
}

class StubFirebaseError extends Error {
  public constructor(public readonly code: string) {
    super(code);
  }
}

class StubFirebaseAuth implements FirebaseAuthClient {
  public result: DecodedIdToken = decodedToken();
  public error: Error | null = null;

  public verifyIdToken(): Promise<DecodedIdToken> {
    if (this.error !== null) {
      return Promise.reject(this.error);
    }

    return Promise.resolve(this.result);
  }
}

describe('FirebaseIdentityTokenVerifier', () => {
  it('maps verified Firebase claims to a provider-neutral identity', async () => {
    const firebaseAuth = new StubFirebaseAuth();
    firebaseAuth.result = decodedToken({
      email: 'user@example.com',
      email_verified: true,
    });

    await expect(
      new FirebaseIdentityTokenVerifier(firebaseAuth).verify('valid-token'),
    ).resolves.toEqual({
      subject: 'firebase-user',
      email: 'user@example.com',
      emailVerified: true,
    });
  });

  it('supports a verified identity without an email', async () => {
    await expect(
      new FirebaseIdentityTokenVerifier(new StubFirebaseAuth()).verify(
        'valid-token',
      ),
    ).resolves.toMatchObject({ email: null, emailVerified: false });
  });

  it.each([
    'auth/id-token-expired',
    'auth/id-token-revoked',
    'auth/argument-error',
  ])('maps Firebase error %s to an invalid token', async (code) => {
    const firebaseAuth = new StubFirebaseAuth();
    firebaseAuth.error = new StubFirebaseError(code);

    await expect(
      new FirebaseIdentityTokenVerifier(firebaseAuth).verify('bad-token'),
    ).rejects.toThrow(InvalidIdentityTokenError);
  });

  it.each([new StubFirebaseError('auth/internal-error'), new Error('network')])(
    'maps provider failures to service unavailable',
    async (error) => {
      const firebaseAuth = new StubFirebaseAuth();
      firebaseAuth.error = error;

      await expect(
        new FirebaseIdentityTokenVerifier(firebaseAuth).verify('token'),
      ).rejects.toThrow(IdentityProviderUnavailableError);
    },
  );

  it('rejects a token with an empty uid', async () => {
    const firebaseAuth = new StubFirebaseAuth();
    firebaseAuth.result = decodedToken({ uid: ' ' });

    await expect(
      new FirebaseIdentityTokenVerifier(firebaseAuth).verify('token'),
    ).rejects.toThrow(InvalidIdentityTokenError);
  });
});
