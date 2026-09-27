import { Chunk } from '../../domain/chunk';

export interface ChunkRepository {
  saveMany(chunks: readonly Chunk[]): Promise<void>;
  findByVideoAndIndex(videoId: string, index: number): Promise<Chunk | null>;
  claim(videoId: string, index: number): Promise<Chunk | null>;
  markCompleted(videoId: string, index: number, frameCount: number): Promise<void>;
  markFailed(videoId: string, index: number): Promise<void>;
}
