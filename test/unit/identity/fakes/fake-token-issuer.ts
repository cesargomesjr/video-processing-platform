import {
  IssuedToken,
  TokenIssuer,
} from '../../../../src/contexts/identity/application/ports/token-issuer';

export class FakeTokenIssuer implements TokenIssuer {
  public issue(userId: string): Promise<IssuedToken> {
    return Promise.resolve({ accessToken: `token-for-${userId}`, expiresIn: '15m' });
  }
}
