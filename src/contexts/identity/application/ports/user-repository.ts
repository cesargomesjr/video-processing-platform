import { Email } from '../../domain/email';
import { User } from '../../domain/user';

export interface UserRepository {
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
}
