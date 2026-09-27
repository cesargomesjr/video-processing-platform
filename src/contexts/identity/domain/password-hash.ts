import { DomainError } from './domain-error';

export class InvalidPasswordHashError extends DomainError {
  public constructor() {
    super('Password hash must not be empty');
  }
}

export class PasswordHash {
  private constructor(private readonly _value: string) {}

  public static create(hash: string): PasswordHash {
    if (hash.length === 0) {
      throw new InvalidPasswordHashError();
    }

    return new PasswordHash(hash);
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: PasswordHash): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return '[PasswordHash]';
  }
}
