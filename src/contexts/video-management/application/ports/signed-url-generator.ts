export interface SignedUrl {
  url: string;
  expiresAt: Date;
}

export interface SignedUrlGenerator {
  generate(key: string, expiresInSeconds: number): Promise<SignedUrl>;
}
