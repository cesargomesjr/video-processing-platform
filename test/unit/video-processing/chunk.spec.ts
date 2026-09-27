import {
  Chunk,
  ChunkAlreadyCompletedError,
  InvalidChunkError,
  InvalidChunkStatusTransitionError,
} from '../../../src/contexts/video-processing/domain/chunk';
import { ChunkStatus } from '../../../src/contexts/video-processing/domain/chunk-status';

describe('Chunk', () => {
  const base = { videoId: 'video-1', index: 0, totalChunks: 2 };

  it('creates a chunk as PENDING', () => {
    const chunk = Chunk.create(base);

    expect(chunk.videoId).toBe('video-1');
    expect(chunk.index).toBe(0);
    expect(chunk.status).toBe(ChunkStatus.PENDING);
  });

  it('rejects a blank video id', () => {
    expect(() => Chunk.create({ ...base, videoId: '   ' })).toThrow(InvalidChunkError);
  });

  it('rejects an index outside the chunk range', () => {
    expect(() => Chunk.create({ ...base, index: -1 })).toThrow(InvalidChunkError);
    expect(() => Chunk.create({ ...base, index: 2 })).toThrow(InvalidChunkError);
    expect(() => Chunk.create({ ...base, totalChunks: 0 })).toThrow(InvalidChunkError);
  });

  it('reconstitutes a persisted chunk', () => {
    const chunk = Chunk.reconstitute({ ...base, status: ChunkStatus.COMPLETED });

    expect(chunk.status).toBe(ChunkStatus.COMPLETED);
  });

  it('marks a pending chunk as processing', () => {
    const chunk = Chunk.create(base);

    chunk.markAsProcessing();

    expect(chunk.status).toBe(ChunkStatus.PROCESSING);
  });

  it('does not let a completed chunk return to processing', () => {
    const chunk = Chunk.reconstitute({ ...base, status: ChunkStatus.COMPLETED });

    expect(() => chunk.markAsProcessing()).toThrow(ChunkAlreadyCompletedError);
  });

  it('completes a processing chunk', () => {
    const chunk = Chunk.reconstitute({ ...base, status: ChunkStatus.PROCESSING });

    chunk.markAsCompleted();

    expect(chunk.status).toBe(ChunkStatus.COMPLETED);
  });

  it('fails a processing chunk', () => {
    const chunk = Chunk.reconstitute({ ...base, status: ChunkStatus.PROCESSING });

    chunk.markAsFailed();

    expect(chunk.status).toBe(ChunkStatus.FAILED);
  });

  it('retries a failed chunk', () => {
    const chunk = Chunk.reconstitute({ ...base, status: ChunkStatus.FAILED });

    chunk.retry();

    expect(chunk.status).toBe(ChunkStatus.PENDING);
  });

  it('rejects invalid transitions', () => {
    const chunk = Chunk.create(base);

    expect(() => chunk.markAsCompleted()).toThrow(InvalidChunkStatusTransitionError);
  });
});
