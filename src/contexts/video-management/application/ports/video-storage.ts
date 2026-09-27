export interface VideoStorage {
  put(key: string, content: Buffer): Promise<void>;
}
