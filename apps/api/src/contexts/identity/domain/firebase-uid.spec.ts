import { FirebaseUid, InvalidFirebaseUidError } from './firebase-uid.js';

describe('FirebaseUid', () => {
  it('trims and exposes a valid UID', () => {
    expect(FirebaseUid.create(' firebase-user ').toString()).toBe(
      'firebase-user',
    );
  });

  it.each(['', ' ', 'a'.repeat(129)])('rejects invalid UID %p', (value) => {
    expect(() => FirebaseUid.create(value)).toThrow(InvalidFirebaseUidError);
  });
});
