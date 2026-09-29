import { Chunk } from '../../../src/contexts/video-processing/domain/chunk';
import { ChunkLease } from '../../../src/contexts/video-processing/domain/chunk-lease';
import { ChunkReaper } from '../../../src/contexts/video-processing/domain/chunk-reaper';
import { ChunkStatus } from '../../../src/contexts/video-processing/domain/chunk-status';

function processingChunk(lease: ChunkLease | null): Chunk {
  return Chunk.reconstitute({
    videoId: 'video-1',
    index: 0,
    totalChunks: 1,
    status: ChunkStatus.PROCESSING,
    frameCount: null,
    lease,
  });
}

describe('ChunkReaper', () => {
  const now = new Date('2026-01-01T00:02:00.000Z');
  const reaper = new ChunkReaper();

  it('releases expired processing chunks', () => {
    const chunk = processingChunk(
      ChunkLease.create('worker-1', new Date('2026-01-01T00:01:00.000Z')),
    );

    const released = reaper.releaseExpired([chunk], now);

    expect(released).toBe(1);
    expect(chunk.status).toBe(ChunkStatus.PENDING);
    expect(chunk.lease).toBeNull();
  });

  it('does not release a non-expired lease', () => {
    const chunk = processingChunk(
      ChunkLease.create('worker-1', new Date('2026-01-01T00:03:00.000Z')),
    );

    expect(reaper.releaseExpired([chunk], now)).toBe(0);
    expect(chunk.status).toBe(ChunkStatus.PROCESSING);
  });

  it('does not release a non-processing chunk', () => {
    const chunk = Chunk.reconstitute({
      videoId: 'video-1',
      index: 0,
      totalChunks: 1,
      status: ChunkStatus.COMPLETED,
      frameCount: 1,
      lease: null,
    });

    expect(reaper.releaseExpired([chunk], now)).toBe(0);
    expect(chunk.status).toBe(ChunkStatus.COMPLETED);
  });
});
