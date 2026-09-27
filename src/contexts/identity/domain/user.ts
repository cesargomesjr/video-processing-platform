import { DomainError } from './domain-error';
import { Email } from './email';
import { PasswordHash } from './password-hash';

export class InvalidUserIdError extends DomainError {
  public constructor() {
    super('User id must not be empty');
  }
}

export class User {
  private constructor(
    private readonly _id: string,
    private readonly _email: Email,
    private readonly _passwordHash: PasswordHash,
  ) {}

  public static register(id: string, email: Email, passwordHash: PasswordHash): User {
    if (id.trim().length === 0) {
      throw new InvalidUserIdError();
    }

    return new User(id, email, passwordHash);
  }

  public get id(): string {
    return this._id;
  }

  public get email(): Email {
    return this._email;
  }

  public get passwordHash(): PasswordHash {
    return this._passwordHash;
  }

  public equals(other: User): boolean {
    return this._id === other._id;
  }
}
