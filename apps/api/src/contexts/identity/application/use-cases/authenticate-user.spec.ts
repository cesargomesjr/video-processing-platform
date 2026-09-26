import type { User } from '../../domain/user.js';
import type {
  IdentityTokenVerifier,
  VerifiedIdentity,
} from '../ports/identity-token-verifier.js';
import type { UserIdGenerator } from '../ports/user-id-generator.js';
import type { UserRepository } from '../ports/user-repository.js';
import { AuthenticateUser } from './authenticate-user.js';
import { ResolveAuthenticatedUser } from './resolve-authenticated-user.js';

describe('AuthenticateUser', () => {
  it('verifies the credential and resolves the local user', async () => {
    const identity: VerifiedIdentity = {
      subject: 'firebase-user',
      email: 'user@example.com',
      emailVerified: true,
    };
    let receivedIdentityToken: string | null = null;
    const identityTokenVerifier: IdentityTokenVerifier = {
      verify: (identityToken) => {
        receivedIdentityToken = identityToken;
        return Promise.resolve(identity);
      },
    };
    let persistedUser: User | null = null;
    const userRepository: UserRepository = {
      upsertByFirebaseUid: (user) => {
        persistedUser = user;
        return Promise.resolve(user);
      },
    };
    const userIdGenerator: UserIdGenerator = {
      generate: () => '9d4f4a0b-0987-4f35-8348-fcda7c5e1467',
    };
    const resolveAuthenticatedUser = new ResolveAuthenticatedUser(
      userRepository,
      userIdGenerator,
      () => new Date('2026-09-26T12:00:00.000Z'),
    );
    const useCase = new AuthenticateUser(
      identityTokenVerifier,
      resolveAuthenticatedUser,
    );

    const user = await useCase.execute('opaque-token');

    expect(user.firebaseUid.toString()).toBe(identity.subject);
    expect(receivedIdentityToken).toBe('opaque-token');
    expect(persistedUser).toBe(user);
  });
});
