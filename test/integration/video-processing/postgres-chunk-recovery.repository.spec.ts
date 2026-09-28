import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

import { PostgresChunkRecoveryRepository } from '../../../src/contexts/video-processing/infrastructure/typeorm/postgres-chunk-recovery.repository';
import { ChunkEntity } from '../../../src/contexts/video-processing/infrastructure/typeorm/chunk.entity';
import { VideoEntity } from '../../../src/contexts/video-management/infrastructure/typeorm/video.entity';

const VIDEO_ID = '11111111-1111-1111-1111-111111111111';

describe('PostgresChunkRecoveryRepository', () => {
  let postgres: StartedPostgreSqlContainer;
  let dataSource: DataSource;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:16-alpine').start();
    dataSource = new DataSource({
      type: 'postgres',
      url: postgres.getConnectionUri(),
      entities: [VideoEntity, ChunkEntity],
      synchronize: true,
    });
    await dataSource.initialize();
  }, 120_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    if (postgres !== undefined) {
      await postgres.stop();
    }
  });

  it('reserves old pending and expired chunks once across concurrent workers', async () => {
    await dataSource.getRepository(VideoEntity).save({
      id: VIDEO_ID,
      ownerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      originalName: 'movie.mp4',
      format: 'mp4',
      sizeBytes: '1000',
      durationMs: '40000',
      storageKey: 'original/movie.mp4',
      zipKey: null,
      status: 'PROCESSING',
    });
    for (const chunkIndex of [0, 1, 2]) {
      await dataSource.getRepository(ChunkEntity).save({
        videoId: VIDEO_ID,
        chunkIndex,
        startMs: String(chunkIndex * 10_000),
        durationMs: '10000',
        status: chunkIndex === 1 ? 'PROCESSING' : 'PENDING',
        workerId: chunkIndex === 1 ? 'old-worker' : null,
        lockedUntil: chunkIndex === 1 ? new Date('2026-09-28T01:00:00Z') : null,
        frameCount: null,
      });
    }
    await dataSource.query(
      'UPDATE video_chunks SET updated_at = $1 WHERE video_id = $2 AND chunk_index <> 2',
      [new Date('2026-09-28T01:00:00Z'), VIDEO_ID],
    );

    const repository = new PostgresChunkRecoveryRepository(dataSource);
    const [first, second] = await Promise.all([
      repository.reserveStale(new Date('2026-09-28T01:55:00Z'), 100),
      repository.reserveStale(new Date('2026-09-28T01:55:00Z'), 100),
    ]);
    const events = [...first, ...second].sort((a, b) => a.chunkIndex - b.chunkIndex);

    expect(events).toEqual([
      {
        videoId: VIDEO_ID,
        chunkIndex: 0,
        startSeconds: 0,
        durationSeconds: 10,
        storageKey: 'original/movie.mp4',
      },
      {
        videoId: VIDEO_ID,
        chunkIndex: 1,
        startSeconds: 10,
        durationSeconds: 10,
        storageKey: 'original/movie.mp4',
      },
    ]);
    expect(await repository.reserveStale(new Date('2026-09-28T01:55:00Z'), 100)).toEqual([]);
    expect(
      (await dataSource.getRepository(ChunkEntity).findOneBy({ videoId: VIDEO_ID, chunkIndex: 1 }))
        ?.status,
    ).toBe('PENDING');
  });
});
