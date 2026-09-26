import { FirebaseUid } from '../../domain/firebase-uid.js';
import { User } from '../../domain/user.js';
import { UserId } from '../../domain/user-id.js';
import type { VerifiedIdentity } from '../ports/identity-token-verifier.js';
import type { UserIdGenerator } from '../ports/user-id-generator.js';
import type { UserRepository } from '../ports/user-repository.js';

export class ResolveAuthenticatedUser {
  public constructor(
    private readonly userRepository: UserRepository,
    private readonly userIdGenerator: UserIdGenerator,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async execute(identity: VerifiedIdentity): Promise<User> {
    const now = this.clock();
    const candidate = User.create(
      {
        id: UserId.create(this.userIdGenerator.generate()),
        firebaseUid: FirebaseUid.create(identity.subject),
        email: identity.email,
        emailVerified: identity.emailVerified,
      },
      now,
    );

    return this.userRepository.upsertByFirebaseUid(candidate);
  }
}
