import { DataSource, In, Repository } from 'typeorm';

import { ChunkRepository } from '../../application/ports/chunk-repository';
import { Chunk } from '../../domain/chunk';
import { ChunkLease } from '../../domain/chunk-lease';
import { ChunkStatus } from '../../domain/chunk-status';
import { ChunkEntity } from './chunk.entity';

const CLAIM_TTL_MS = 60_000;

export class PostgresChunkRepository implements ChunkRepository {
  private readonly repository: Repository<ChunkEntity>;

  public constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ChunkEntity);
  }

  public async saveMany(chunks: readonly Chunk[]): Promise<void> {
    if (chunks.length === 0) {
      return;
    }

    const values = chunks.map((chunk) => ({
      videoId: chunk.videoId,
      chunkIndex: chunk.index,
      startMs: BigInt(chunk.startMs).toString(),
      durationMs: BigInt(chunk.durationMs).toString(),
      status: chunk.status.value,
      frameCount: chunk.frameCount,
      workerId: chunk.lease?.workerId ?? null,
      lockedUntil: chunk.lease?.lockedUntil ?? null,
    }));

    await this.repository
      .createQueryBuilder()
      .insert()
      .into(ChunkEntity)
      .values(values)
      .orIgnore()
      .execute();
  }

  public async findByVideoId(videoId: string): Promise<Chunk[]> {
    const entities = await this.repository.find({
      where: { videoId },
      order: { chunkIndex: 'ASC' },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  public async findByVideoAndIndex(videoId: string, index: number): Promise<Chunk | null> {
    const entity = await this.repository.findOneBy({ videoId, chunkIndex: index });
    return entity === null ? null : this.toDomain(entity);
  }

  public async claim(videoId: string, index: number): Promise<Chunk | null> {
    const result = await this.repository.update(
      {
        videoId,
        chunkIndex: index,
        status: In([ChunkStatus.PENDING.value, ChunkStatus.FAILED.value]),
      },
      {
        status: ChunkStatus.PROCESSING.value,
        workerId: `worker-${process.pid}`,
        lockedUntil: new Date(Date.now() + CLAIM_TTL_MS),
      },
    );

    if (result.affected === 0) {
      return null;
    }

    return this.findByVideoAndIndex(videoId, index);
  }

  public async markCompleted(videoId: string, index: number, frameCount: number): Promise<void> {
    await this.repository.update(
      { videoId, chunkIndex: index, status: ChunkStatus.PROCESSING.value },
      {
        status: ChunkStatus.COMPLETED.value,
        frameCount,
        workerId: null,
        lockedUntil: null,
      },
    );
  }

  public async markFailed(videoId: string, index: number): Promise<void> {
    await this.repository.update(
      { videoId, chunkIndex: index, status: ChunkStatus.PROCESSING.value },
      {
        status: ChunkStatus.FAILED.value,
        workerId: null,
        lockedUntil: null,
      },
    );
  }

  private toDomain(entity: ChunkEntity): Chunk {
    return Chunk.reconstitute({
      videoId: entity.videoId,
      index: entity.chunkIndex,
      status: ChunkStatus.fromValue(entity.status),
      frameCount: entity.frameCount,
      startMs: Number(entity.startMs),
      durationMs: Number(entity.durationMs),
      lease:
        entity.workerId !== null && entity.lockedUntil !== null
          ? ChunkLease.create(entity.workerId, entity.lockedUntil)
          : null,
    });
  }
}
