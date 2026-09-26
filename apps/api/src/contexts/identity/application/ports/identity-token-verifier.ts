export type VerifiedIdentity = Readonly<{
  subject: string;
  email: string | null;
  emailVerified: boolean;
}>;

export abstract class IdentityTokenVerifier {
  public abstract verify(identityToken: string): Promise<VerifiedIdentity>;
}
