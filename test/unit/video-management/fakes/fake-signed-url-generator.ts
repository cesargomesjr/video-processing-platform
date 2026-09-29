import {
  SignedUrl,
  SignedUrlGenerator,
} from '../../../../src/contexts/video-management/application/ports/signed-url-generator';

export class FakeSignedUrlGenerator implements SignedUrlGenerator {
  public readonly generated: Array<{ key: string; expiresInSeconds: number }> = [];
  public url = 'https://storage.example/signed';

  public generate(key: string, expiresInSeconds: number): Promise<SignedUrl> {
    this.generated.push({ key, expiresInSeconds });
    return Promise.resolve({
      url: this.url,
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  }
}
