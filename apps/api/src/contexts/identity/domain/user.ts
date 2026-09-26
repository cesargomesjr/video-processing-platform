import type { FirebaseUid } from './firebase-uid.js';
import type { UserId } from './user-id.js';

const MAX_EMAIL_LENGTH = 320;

export class InvalidUserEmailError extends Error {
  public constructor() {
    super('User email must be null or a valid email address');
    this.name = 'InvalidUserEmailError';
  }
}

export type UserProperties = Readonly<{
  id: UserId;
  firebaseUid: FirebaseUid;
  email: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}>;

function normalizeEmail(email: string | null): string | null {
  if (email === null) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const atIndex = normalizedEmail.indexOf('@');

  if (
    normalizedEmail.length === 0 ||
    normalizedEmail.length > MAX_EMAIL_LENGTH ||
    atIndex <= 0 ||
    atIndex === normalizedEmail.length - 1
  ) {
    throw new InvalidUserEmailError();
  }

  return normalizedEmail;
}

export class User {
  private readonly properties: UserProperties;

  private constructor(properties: UserProperties) {
    this.properties = {
      ...properties,
      email: normalizeEmail(properties.email),
    };
  }

  public static create(
    properties: Omit<UserProperties, 'createdAt' | 'updatedAt'>,
    now: Date,
  ): User {
    return new User({ ...properties, createdAt: now, updatedAt: now });
  }

  public static restore(properties: UserProperties): User {
    return new User(properties);
  }

  public get id(): UserId {
    return this.properties.id;
  }

  public get firebaseUid(): FirebaseUid {
    return this.properties.firebaseUid;
  }

  public get email(): string | null {
    return this.properties.email;
  }

  public get emailVerified(): boolean {
    return this.properties.emailVerified;
  }

  public get createdAt(): Date {
    return this.properties.createdAt;
  }

  public get updatedAt(): Date {
    return this.properties.updatedAt;
  }
}
