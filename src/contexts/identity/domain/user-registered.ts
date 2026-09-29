import { Email } from './email';
import { User } from './user';

export class UserRegistered {
  public constructor(
    public readonly userId: string,
    public readonly email: Email,
    public readonly occurredAt: Date,
  ) {}

  public static from(user: User, occurredAt: Date): UserRegistered {
    return new UserRegistered(user.id, user.email, occurredAt);
  }
}
