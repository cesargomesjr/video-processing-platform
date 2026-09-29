import { Chunk } from './chunk';
import { ChunkStatus } from './chunk-status';

export class ChunkReaper {
  public releaseExpired(chunks: readonly Chunk[], now: Date): number {
    let released = 0;

    for (const chunk of chunks) {
      if (chunk.status === ChunkStatus.PROCESSING && chunk.isLeaseExpired(now)) {
        chunk.release();
        released += 1;
      }
    }

    return released;
  }
}
