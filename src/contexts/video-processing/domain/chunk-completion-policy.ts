import { DomainError } from './domain-error';
import { Chunk } from './chunk';
import { ChunkStatus } from './chunk-status';

export class ChunkAggregationNotReadyError extends DomainError {
  public constructor() {
    super('Not all chunks are completed');
  }
}

export class ChunkCompletionPolicy {
  public assertAllCompleted(chunks: readonly Chunk[]): void {
    if (chunks.some((chunk) => chunk.status !== ChunkStatus.COMPLETED)) {
      throw new ChunkAggregationNotReadyError();
    }
  }
}
