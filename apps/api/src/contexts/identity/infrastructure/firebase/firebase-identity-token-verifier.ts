import type { DecodedIdToken } from 'firebase-admin/auth';
import {
  IdentityProviderUnavailableError,
  InvalidIdentityTokenError,
} from '../../application/errors/identity-errors.js';
import {
  IdentityTokenVerifier,
  type VerifiedIdentity,
} from '../../application/ports/identity-token-verifier.js';

export type FirebaseAuthClient = Readonly<{
  verifyIdToken(
    identityToken: string,
    checkRevoked?: boolean,
  ): Promise<DecodedIdToken>;
}>;

function firebaseErrorCode(error: unknown): string | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }

  return null;
}

function isProviderFailure(code: string | null): boolean {
  return code === null || code === 'auth/internal-error';
}

export class FirebaseIdentityTokenVerifier extends IdentityTokenVerifier {
  public constructor(private readonly firebaseAuth: FirebaseAuthClient) {
    super();
  }

  public override async verify(
    identityToken: string,
  ): Promise<VerifiedIdentity> {
    let decodedToken: DecodedIdToken;

    try {
      decodedToken = await this.firebaseAuth.verifyIdToken(identityToken);
    } catch (error: unknown) {
      const code = firebaseErrorCode(error);

      if (isProviderFailure(code)) {
        throw new IdentityProviderUnavailableError();
      }

      throw new InvalidIdentityTokenError();
    }

    if (
      decodedToken.uid.trim().length === 0 ||
      (decodedToken.email !== undefined &&
        typeof decodedToken.email !== 'string')
    ) {
      throw new InvalidIdentityTokenError();
    }

    return {
      subject: decodedToken.uid,
      email: decodedToken.email ?? null,
      emailVerified: decodedToken.email_verified === true,
    };
  }
}
