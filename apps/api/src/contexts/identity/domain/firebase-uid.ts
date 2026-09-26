const MAX_FIREBASE_UID_LENGTH = 128;

export class InvalidFirebaseUidError extends Error {
  public constructor() {
    super('FirebaseUid must contain between 1 and 128 characters');
    this.name = 'InvalidFirebaseUidError';
  }
}

export class FirebaseUid {
  private constructor(private readonly value: string) {}

  public static create(value: string): FirebaseUid {
    const normalizedValue = value.trim();

    if (
      normalizedValue.length === 0 ||
      normalizedValue.length > MAX_FIREBASE_UID_LENGTH
    ) {
      throw new InvalidFirebaseUidError();
    }

    return new FirebaseUid(normalizedValue);
  }

  public toString(): string {
    return this.value;
  }
}
