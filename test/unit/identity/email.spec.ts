import { Email, InvalidEmailError } from '../../../src/contexts/identity/domain/email';

describe('Email', () => {
  it('normalizes to lowercase and trims surrounding whitespace', () => {
    expect(Email.create('  User@Example.COM ').value).toBe('user@example.com');
  });

  it('rejects values without a valid local@domain shape', () => {
    expect(() => Email.create('not-an-email')).toThrow(InvalidEmailError);
    expect(() => Email.create('@domain.com')).toThrow(InvalidEmailError);
    expect(() => Email.create('user@')).toThrow(InvalidEmailError);
    expect(() => Email.create('user domain')).toThrow(InvalidEmailError);
  });

  it('rejects blank values', () => {
    expect(() => Email.create('   ')).toThrow(InvalidEmailError);
  });

  it('rejects values longer than the maximum length', () => {
    const tooLong = `${'a'.repeat(315)}@example.com`;
    expect(() => Email.create(tooLong)).toThrow(InvalidEmailError);
  });

  it('compares by normalized value', () => {
    expect(Email.create('User@Example.COM').equals(Email.create('user@example.com'))).toBe(true);
    expect(Email.create('user@example.com').equals(Email.create('other@example.com'))).toBe(false);
  });

  it('exposes the normalized value through toString', () => {
    expect(Email.create('User@Example.COM').toString()).toBe('user@example.com');
  });
});
