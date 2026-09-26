import type { User } from '../../domain/user.js';
import { UserIdGenerator } from '../ports/user-id-generator.js';
import { UserRepository } from '../ports/user-repository.js';
import { ResolveAuthenticatedUser } from './resolve-authenticated-user.js';

class InMemoryUserRepository extends UserRepository {
  private readonly usersByFirebaseUid = new Map<string, User>();

  public upsertByFirebaseUid(candidate: User): Promise<User> {
    const key = candidate.firebaseUid.toString();
    const existing = this.usersByFirebaseUid.get(key);

    if (existing !== undefined) {
      return Promise.resolve(existing);
    }

    this.usersByFirebaseUid.set(key, candidate);
    return Promise.resolve(candidate);
  }
}

class StubUserIdGenerator extends UserIdGenerator {
  public generate(): string {
    return '123e4567-e89b-42d3-a456-426614174000';
  }
}

describe('ResolveAuthenticatedUser', () => {
  it('provisions a local user from a verified identity', async () => {
    const resolver = new ResolveAuthenticatedUser(
      new InMemoryUserRepository(),
      new StubUserIdGenerator(),
      () => new Date('2026-09-26T12:00:00.000Z'),
    );

    const user = await resolver.execute({
      subject: 'firebase-user',
      email: 'user@example.com',
      emailVerified: true,
    });

    expect(user.id.toString()).toBe('123e4567-e89b-42d3-a456-426614174000');
    expect(user.firebaseUid.toString()).toBe('firebase-user');
    expect(user.email).toBe('user@example.com');
  });

  it('returns the same local identity on repeated provisioning', async () => {
    const resolver = new ResolveAuthenticatedUser(
      new InMemoryUserRepository(),
      new StubUserIdGenerator(),
    );
    const identity = {
      subject: 'firebase-user',
      email: 'user@example.com',
      emailVerified: false,
    };

    const first = await resolver.execute(identity);
    const second = await resolver.execute(identity);

    expect(second.id.equals(first.id)).toBe(true);
  });
});
