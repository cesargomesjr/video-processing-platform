import type { User } from '../../domain/user.js';
import type { IdentityTokenVerifier } from '../ports/identity-token-verifier.js';
import type { ResolveAuthenticatedUser } from './resolve-authenticated-user.js';

export class AuthenticateUser {
  public constructor(
    private readonly identityTokenVerifier: IdentityTokenVerifier,
    private readonly resolveAuthenticatedUser: ResolveAuthenticatedUser,
  ) {}

  public async execute(identityToken: string): Promise<User> {
    const identity = await this.identityTokenVerifier.verify(identityToken);

    return this.resolveAuthenticatedUser.execute(identity);
  }
}
