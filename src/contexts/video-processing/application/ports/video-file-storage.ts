export interface VideoFileStorage {
  get(key: string): Promise<Buffer>;
  put(key: string, content: Buffer): Promise<void>;
}
