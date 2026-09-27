import { Email } from '../../../src/contexts/identity/domain/email';
import { PasswordHash } from '../../../src/contexts/identity/domain/password-hash';
import { User } from '../../../src/contexts/identity/domain/user';
import { UserRegistered } from '../../../src/contexts/identity/domain/user-registered';

describe('UserRegistered', () => {
  it('carries the user id, email and occurrence timestamp', () => {
    const user = User.register(
      'user-1',
      Email.create('User@Example.COM'),
      PasswordHash.create('$2b$10$hash'),
    );
    const occurredAt = new Date('2026-01-01T00:00:00.000Z');

    const event = UserRegistered.from(user, occurredAt);

    expect(event.userId).toBe('user-1');
    expect(event.email.value).toBe('user@example.com');
    expect(event.occurredAt).toBe(occurredAt);
  });
});
