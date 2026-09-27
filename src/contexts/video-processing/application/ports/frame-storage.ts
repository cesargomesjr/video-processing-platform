export interface FrameStorage {
  put(key: string, content: Buffer): Promise<void>;
}
