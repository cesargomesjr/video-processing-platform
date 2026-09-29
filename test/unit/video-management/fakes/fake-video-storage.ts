import { VideoStorage } from '../../../../src/contexts/video-management/application/ports/video-storage';
import { VideoFileStorage } from '../../../../src/contexts/video-processing/application/ports/video-file-storage';

export class FakeVideoStorage implements VideoStorage, VideoFileStorage {
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
