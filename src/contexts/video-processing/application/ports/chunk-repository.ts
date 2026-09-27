import { Chunk } from '../../domain/chunk';

export interface ChunkRepository {
  saveMany(chunks: readonly Chunk[]): Promise<void>;
}
