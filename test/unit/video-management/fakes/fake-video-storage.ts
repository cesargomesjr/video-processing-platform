import { VideoStorage } from '../../../../src/contexts/video-management/application/ports/video-storage';

export class FakeVideoStorage implements VideoStorage {
  public readonly stored = new Map<string, Buffer>();
  public shouldFail = false;

  public put(key: string, content: Buffer): Promise<void> {
    if (this.shouldFail) {
      return Promise.reject(new Error('storage unavailable'));
    }

    this.stored.set(key, content);
    return Promise.resolve();
  }

  public get(key: string): Promise<Buffer> {
    return Promise.resolve(this.stored.get(key) ?? Buffer.alloc(0));
  }
}
