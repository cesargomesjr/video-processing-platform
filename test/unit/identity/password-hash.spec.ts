import {
  InvalidPasswordHashError,
  PasswordHash,
} from '../../../src/contexts/identity/domain/password-hash';

describe('PasswordHash', () => {
  it('does not expose the hash through toString', () => {
    const hash = PasswordHash.create('$2b$10$abcdefghijklmnopqrstuv');

    expect(hash.toString()).toBe('[PasswordHash]');
    expect(hash.toString()).not.toContain('$2b$10$');
  });

  it('exposes the raw value for persistence', () => {
    expect(PasswordHash.create('$2b$10$abc').value).toBe('$2b$10$abc');
  });

  it('rejects an empty hash', () => {
    expect(() => PasswordHash.create('')).toThrow(InvalidPasswordHashError);
  });

  it('compares by value', () => {
    expect(PasswordHash.create('h1').equals(PasswordHash.create('h1'))).toBe(true);
    expect(PasswordHash.create('h1').equals(PasswordHash.create('h2'))).toBe(false);
  });
});
