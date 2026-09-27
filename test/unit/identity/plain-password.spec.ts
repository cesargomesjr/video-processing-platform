import {
  PlainPassword,
  WeakPasswordError,
} from '../../../src/contexts/identity/domain/plain-password';

describe('PlainPassword', () => {
  it('accepts a password with a letter and a digit within the length limits', () => {
    expect(PlainPassword.create('Str0ngPass').value).toBe('Str0ngPass');
  });

  it('rejects passwords shorter than the minimum', () => {
    expect(() => PlainPassword.create('Ab1')).toThrow(WeakPasswordError);
  });

  it('rejects passwords longer than the maximum', () => {
    expect(() => PlainPassword.create(`a1${'x'.repeat(127)}`)).toThrow(WeakPasswordError);
  });

  it('rejects passwords without a letter', () => {
    expect(() => PlainPassword.create('12345678')).toThrow(WeakPasswordError);
  });

  it('rejects passwords without a digit', () => {
    expect(() => PlainPassword.create('abcdefgh')).toThrow(WeakPasswordError);
  });

  it('compares by value', () => {
    expect(PlainPassword.create('Str0ngPass').equals(PlainPassword.create('Str0ngPass'))).toBe(
      true,
    );
    expect(PlainPassword.create('Str0ngPass').equals(PlainPassword.create('0therPass'))).toBe(
      false,
    );
  });

  it('does not expose the password through toString', () => {
    expect(PlainPassword.create('Str0ngPass').toString()).toBe('[PlainPassword]');
  });
});
