import { DomainError } from './domain-error';

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;
const HAS_LETTER = /[a-zA-Z]/;
const HAS_DIGIT = /[0-9]/;

export class WeakPasswordError extends DomainError {
  public constructor() {
    super(
      'Password must be 8 to 128 characters long and contain at least one letter and one digit',
    );
  }
}

export class PlainPassword {
  private constructor(private readonly _value: string) {}

  public static create(raw: string): PlainPassword {
    if (
      raw.length < MIN_LENGTH ||
      raw.length > MAX_LENGTH ||
      !HAS_LETTER.test(raw) ||
      !HAS_DIGIT.test(raw)
    ) {
      throw new WeakPasswordError();
    }

    return new PlainPassword(raw);
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: PlainPassword): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return '[PlainPassword]';
  }
}
