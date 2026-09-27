export interface IssuedToken {
  accessToken: string;
  expiresIn: string;
}

export interface TokenIssuer {
  issue(userId: string): Promise<IssuedToken>;
}
