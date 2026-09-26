import { FirebaseUid } from './firebase-uid.js';
import { InvalidUserEmailError, User } from './user.js';
import { UserId } from './user-id.js';

const id = UserId.create('123e4567-e89b-42d3-a456-426614174000');
const firebaseUid = FirebaseUid.create('firebase-user');
const now = new Date('2026-09-26T12:00:00.000Z');

describe('User', () => {
  it('creates an identity and normalizes its email', () => {
    const user = User.create(
      {
        id,
        firebaseUid,
        email: ' User@Example.com ',
        emailVerified: true,
      },
      now,
    );

    expect(user.id).toBe(id);
    expect(user.firebaseUid).toBe(firebaseUid);
    expect(user.email).toBe('user@example.com');
    expect(user.emailVerified).toBe(true);
    expect(user.createdAt).toEqual(now);
    expect(user.updatedAt).toEqual(now);
  });

  it('supports identities without an email', () => {
    const user = User.create(
      { id, firebaseUid, email: null, emailVerified: false },
      now,
    );

    expect(user.email).toBeNull();
  });

  it.each(['invalid', '@example.com', 'user@'])(
    'rejects invalid email %p',
    (email) => {
      expect(() =>
        User.create({ id, firebaseUid, email, emailVerified: false }, now),
      ).toThrow(InvalidUserEmailError);
    },
  );
});
