import { DomainError } from './domain-error';

const EMAIL_MAX_LENGTH = 320;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

export class InvalidEmailError extends DomainError {
  public constructor(email: string) {
    super(`Invalid email: ${email}`);
  }
}

export class Email {
  private constructor(private readonly _value: string) {}

  public static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();

    if (
      normalized.length === 0 ||
      normalized.length > EMAIL_MAX_LENGTH ||
      !EMAIL_PATTERN.test(normalized)
    ) {
      throw new InvalidEmailError(raw);
    }

    return new Email(normalized);
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: Email): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
