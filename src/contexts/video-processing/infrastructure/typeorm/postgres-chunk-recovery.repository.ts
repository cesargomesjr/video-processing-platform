import { DataSource } from 'typeorm';

import { ChunkRecoveryRepository } from '../../application/ports/chunk-recovery-repository';
import { ProcessVideoChunkEvent } from '../../application/ports/message-publisher';

interface RecoverableChunkRow {
  videoId: string;
  chunkIndex: number;
  startMs: string;
  durationMs: string;
  storageKey: string;
}

export class PostgresChunkRecoveryRepository implements ChunkRecoveryRepository {
  public constructor(private readonly dataSource: DataSource) {}

  public async reserveStale(before: Date, limit: number): Promise<ProcessVideoChunkEvent[]> {
    const rows = await this.dataSource.query<RecoverableChunkRow[]>(
      `WITH candidates AS MATERIALIZED (
         SELECT c.id, c.video_id, c.chunk_index, c.start_ms, c.duration_ms, v.storage_key
         FROM video_chunks c
         JOIN videos v ON v.id = c.video_id
         WHERE v.status = 'PROCESSING'
           AND ((c.status = 'PENDING' AND c.updated_at < $1)
             OR (c.status = 'PROCESSING' AND c.locked_until < $1))
         ORDER BY c.updated_at, c.chunk_index
         LIMIT $2
         FOR UPDATE OF c SKIP LOCKED
       ), updated AS (
         UPDATE video_chunks c
         SET status = 'PENDING', worker_id = NULL, locked_until = NULL, updated_at = NOW()
         FROM candidates
         WHERE c.id = candidates.id
         RETURNING c.id
       )
       SELECT candidates.video_id AS "videoId", candidates.chunk_index AS "chunkIndex",
              candidates.start_ms AS "startMs", candidates.duration_ms AS "durationMs",
              candidates.storage_key AS "storageKey"
       FROM candidates JOIN updated ON updated.id = candidates.id`,
      [before, limit],
    );

    return rows.map((row) => ({
      videoId: row.videoId,
      chunkIndex: row.chunkIndex,
      startSeconds: Number(row.startMs) / 1_000,
      durationSeconds: Number(row.durationMs) / 1_000,
      storageKey: row.storageKey,
    }));
  }
}
