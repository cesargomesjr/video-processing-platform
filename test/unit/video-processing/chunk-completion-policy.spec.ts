import { Chunk } from '../../../src/contexts/video-processing/domain/chunk';
import { ChunkStatus } from '../../../src/contexts/video-processing/domain/chunk-status';
import {
  ChunkAggregationNotReadyError,
  ChunkCompletionPolicy,
} from '../../../src/contexts/video-processing/domain/chunk-completion-policy';

function chunk(index: number, status: ChunkStatus): Chunk {
  return Chunk.reconstitute({
    videoId: 'video-1',
    index,
    totalChunks: 3,
    status,
  });
}

describe('ChunkCompletionPolicy', () => {
  const policy = new ChunkCompletionPolicy();

  it('allows aggregation when every chunk is completed', () => {
    const chunks = [
      chunk(0, ChunkStatus.COMPLETED),
      chunk(1, ChunkStatus.COMPLETED),
      chunk(2, ChunkStatus.COMPLETED),
    ];

    expect(() => policy.assertAllCompleted(chunks)).not.toThrow();
  });

  it('rejects aggregation when any chunk is pending', () => {
    const chunks = [
      chunk(0, ChunkStatus.COMPLETED),
      chunk(1, ChunkStatus.PENDING),
      chunk(2, ChunkStatus.COMPLETED),
    ];

    expect(() => policy.assertAllCompleted(chunks)).toThrow(ChunkAggregationNotReadyError);
  });
});
