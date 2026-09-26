import { InvalidUserIdError, UserId } from './user-id.js';

describe('UserId', () => {
  it('normalizes and exposes a valid UUID', () => {
    const userId = UserId.create(' 123E4567-E89B-42D3-A456-426614174000 ');

    expect(userId.toString()).toBe('123e4567-e89b-42d3-a456-426614174000');
  });

  it('compares IDs by value', () => {
    const first = UserId.create('123e4567-e89b-42d3-a456-426614174000');
    const second = UserId.create('123e4567-e89b-42d3-a456-426614174000');

    expect(first.equals(second)).toBe(true);
  });

  it('rejects an invalid UUID', () => {
    expect(() => UserId.create('not-an-id')).toThrow(InvalidUserIdError);
  });
});
