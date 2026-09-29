import { BcryptPasswordHasher } from '../../../src/contexts/identity/infrastructure/bcrypt-password-hasher';
import { PlainPassword } from '../../../src/contexts/identity/domain/plain-password';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('hashes without exposing the plain password and verifies it back', async () => {
    const password = PlainPassword.create('Str0ngPass');

    const passwordHash = await hasher.hash(password);

    expect(passwordHash.value).not.toContain(password.value);
    await expect(hasher.verify(password, passwordHash)).resolves.toBe(true);
  });

  it('rejects a different password', async () => {
    const passwordHash = await hasher.hash(PlainPassword.create('Str0ngPass'));

    await expect(hasher.verify(PlainPassword.create('OtherPass1'), passwordHash)).resolves.toBe(
      false,
    );
  });
});
