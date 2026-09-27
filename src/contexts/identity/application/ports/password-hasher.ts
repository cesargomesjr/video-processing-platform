import { PasswordHash } from '../../domain/password-hash';
import { PlainPassword } from '../../domain/plain-password';

export interface PasswordHasher {
  hash(password: PlainPassword): Promise<PasswordHash>;
  verify(password: PlainPassword, hash: PasswordHash): Promise<boolean>;
}
