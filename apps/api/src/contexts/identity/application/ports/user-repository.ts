import type { User } from '../../domain/user.js';

export abstract class UserRepository {
  public abstract upsertByFirebaseUid(candidate: User): Promise<User>;
}
