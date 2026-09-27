import { verify } from 'jsonwebtoken';

import { JwtTokenIssuer } from '../../../src/contexts/identity/infrastructure/jwt-token-issuer';

describe('JwtTokenIssuer', () => {
  const issuer = new JwtTokenIssuer({ secret: 'test-secret', expiresIn: '15m' });

  it('issues a token that carries the user id as subject', async () => {
    const issued = await issuer.issue('user-1');
    const payload = verify(issued.accessToken, 'test-secret') as { sub: string };

    expect(issued.expiresIn).toBe('15m');
    expect(payload.sub).toBe('user-1');
  });
});
