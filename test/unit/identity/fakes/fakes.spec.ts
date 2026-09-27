import { Email } from '../../../../src/contexts/identity/domain/email';
import { PasswordHash } from '../../../../src/contexts/identity/domain/password-hash';
import { PlainPassword } from '../../../../src/contexts/identity/domain/plain-password';
import { User } from '../../../../src/contexts/identity/domain/user';
import { FakePasswordHasher } from './fake-password-hasher';
import { FakeTokenIssuer } from './fake-token-issuer';
import { InMemoryUserRepository } from './in-memory-user-repository';

describe('identity fakes', () => {
  it('in-memory user repository saves and finds by normalized email', async () => {
    const repository = new InMemoryUserRepository();
    const user = User.register(
      'user-1',
      Email.create('user@example.com'),
      PasswordHash.create('hash'),
    );

    await repository.save(user);

    await expect(repository.findByEmail(Email.create('USER@example.com'))).resolves.toEqual(user);
    await expect(repository.findByEmail(Email.create('missing@example.com'))).resolves.toBeNull();
  });

  it('fake password hasher hashes and verifies deterministically', async () => {
    const hasher = new FakePasswordHasher();
    const password = PlainPassword.create('Str0ngPass');

    const hash = await hasher.hash(password);

    await expect(hasher.verify(PlainPassword.create('Str0ngPass'), hash)).resolves.toBe(true);
    await expect(hasher.verify(PlainPassword.create('Wr0ngPass'), hash)).resolves.toBe(false);
  });

  it('fake token issuer returns a deterministic token with expiry', async () => {
    const issuer = new FakeTokenIssuer();

    await expect(issuer.issue('user-1')).resolves.toEqual({
      accessToken: 'token-for-user-1',
      expiresIn: '15m',
    });
  });
});
