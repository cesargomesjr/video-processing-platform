import { Email } from '../../../src/contexts/identity/domain/email';
import { PasswordHash } from '../../../src/contexts/identity/domain/password-hash';
import { InvalidUserIdError, User } from '../../../src/contexts/identity/domain/user';

describe('User', () => {
  const email = Email.create('user@example.com');
  const passwordHash = PasswordHash.create('$2b$10$hash');

  it('registers with an id, email and password hash', () => {
    const user = User.register('user-1', email, passwordHash);

    expect(user.id).toBe('user-1');
    expect(user.email.equals(email)).toBe(true);
    expect(user.passwordHash.equals(passwordHash)).toBe(true);
  });

  it('rejects an empty id', () => {
    expect(() => User.register('', email, passwordHash)).toThrow(InvalidUserIdError);
    expect(() => User.register('   ', email, passwordHash)).toThrow(InvalidUserIdError);
  });

  it('compares by id', () => {
    const a = User.register('user-1', email, passwordHash);
    const b = User.register(
      'user-1',
      Email.create('other@example.com'),
      PasswordHash.create('other-hash'),
    );
    const c = User.register('user-2', email, passwordHash);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
