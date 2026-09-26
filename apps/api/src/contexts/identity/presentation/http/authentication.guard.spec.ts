import { UnauthorizedException } from '@nestjs/common';
import { extractBearerToken } from './authentication.guard.js';

describe('extractBearerToken', () => {
  it('extracts a strict bearer token', () => {
    expect(extractBearerToken('Bearer firebase-token')).toBe('firebase-token');
  });

  it.each([
    undefined,
    [],
    'firebase-token',
    'bearer firebase-token',
    'Bearer',
    'Bearer token with spaces',
  ])('rejects malformed authorization %p', (authorization) => {
    expect(() => extractBearerToken(authorization)).toThrow(
      UnauthorizedException,
    );
  });
});
