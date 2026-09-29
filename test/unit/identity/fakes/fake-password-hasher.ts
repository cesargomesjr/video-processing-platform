import { PasswordHasher } from '../../../../src/contexts/identity/application/ports/password-hasher';
import { PasswordHash } from '../../../../src/contexts/identity/domain/password-hash';
import { PlainPassword } from '../../../../src/contexts/identity/domain/plain-password';

export class FakePasswordHasher implements PasswordHasher {
  public hash(password: PlainPassword): Promise<PasswordHash> {
    return Promise.resolve(PasswordHash.create(`hashed:${password.value}`));
  }

  public verify(password: PlainPassword, hash: PasswordHash): Promise<boolean> {
    return Promise.resolve(hash.value === `hashed:${password.value}`);
  }
}
