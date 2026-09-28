import { ChunkStatusValue } from '../../domain/chunk-status';

export interface ProcessingMetrics {
  incrementChunks(status: ChunkStatusValue): void;
}

export class NoopProcessingMetrics implements ProcessingMetrics {
  public incrementChunks(): void {
    // Intentionally empty: metrics are optional for application orchestration.
  }
}
