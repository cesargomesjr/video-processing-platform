import { compare, hash } from 'bcrypt';

import { PasswordHasher } from '../application/ports/password-hasher';
import { PasswordHash } from '../domain/password-hash';
import { PlainPassword } from '../domain/plain-password';

const SALT_ROUNDS = 10;

export class BcryptPasswordHasher implements PasswordHasher {
  public async hash(password: PlainPassword): Promise<PasswordHash> {
    const hashed = await hash(password.value, SALT_ROUNDS);
    return PasswordHash.create(hashed);
  }

  public async verify(password: PlainPassword, passwordHash: PasswordHash): Promise<boolean> {
    return compare(password.value, passwordHash.value);
  }
}
