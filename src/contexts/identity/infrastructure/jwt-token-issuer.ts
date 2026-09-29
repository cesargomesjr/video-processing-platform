import { sign, type SignOptions } from 'jsonwebtoken';

import { IssuedToken, TokenIssuer } from '../application/ports/token-issuer';

export interface JwtTokenIssuerOptions {
  secret: string;
  expiresIn: string;
}

export class JwtTokenIssuer implements TokenIssuer {
  public constructor(private readonly options: JwtTokenIssuerOptions) {}

  public issue(userId: string): Promise<IssuedToken> {
    const accessToken = sign({ sub: userId }, this.options.secret, {
      expiresIn: this.options.expiresIn as SignOptions['expiresIn'],
    });

    return Promise.resolve({
      accessToken,
      expiresIn: this.options.expiresIn,
    });
  }
}
