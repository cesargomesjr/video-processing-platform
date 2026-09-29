import { UserRepository } from '../../../../src/contexts/identity/application/ports/user-repository';
import { Email } from '../../../../src/contexts/identity/domain/email';
import { User } from '../../../../src/contexts/identity/domain/user';

export class InMemoryUserRepository implements UserRepository {
  private readonly usersByEmail = new Map<string, User>();

  public findByEmail(email: Email): Promise<User | null> {
    return Promise.resolve(this.usersByEmail.get(email.value) ?? null);
  }

  public save(user: User): Promise<void> {
    this.usersByEmail.set(user.email.value, user);
    return Promise.resolve();
  }
}
