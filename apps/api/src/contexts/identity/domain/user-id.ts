const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export class InvalidUserIdError extends Error {
  public constructor() {
    super('UserId must be a valid UUID');
    this.name = 'InvalidUserIdError';
  }
}

export class UserId {
  private constructor(private readonly value: string) {}

  public static create(value: string): UserId {
    const normalizedValue = value.trim().toLowerCase();

    if (!UUID_PATTERN.test(normalizedValue)) {
      throw new InvalidUserIdError();
    }

    return new UserId(normalizedValue);
  }

  public equals(other: UserId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
