import { DataSource, LessThan, Repository } from 'typeorm';

import { PaginatedVideos, VideoRepository } from '../../application/ports/video-repository';
import { Video } from '../../domain/video';
import { VideoFormat } from '../../domain/video-format';
import { VideoId } from '../../domain/video-id';
import { VideoSize } from '../../domain/video-size';
import { VideoStatus } from '../../domain/video-status';
import { VideoEntity } from './video.entity';

export class PostgresVideoRepository implements VideoRepository {
  private readonly repository: Repository<VideoEntity>;

  public constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(VideoEntity);
  }

  public async save(video: Video): Promise<void> {
    const entity = this.repository.create({
      id: video.id.value,
      ownerId: video.ownerId,
      originalName: video.originalName,
      format: video.format.value,
      sizeBytes: BigInt(video.size.bytes).toString(),
      durationMs: video.durationMs === null ? null : BigInt(video.durationMs).toString(),
      storageKey: video.storageKey,
      zipKey: video.zipKey,
      status: video.status.value,
    });

    await this.repository.save(entity);
  }

  public async saveTransition(video: Video, expectedStatus: VideoStatus): Promise<boolean> {
    const result = await this.repository.update(
      { id: video.id.value, status: expectedStatus.value },
      {
        ownerId: video.ownerId,
        originalName: video.originalName,
        format: video.format.value,
        sizeBytes: BigInt(video.size.bytes).toString(),
        durationMs: video.durationMs === null ? null : BigInt(video.durationMs).toString(),
        storageKey: video.storageKey,
        zipKey: video.zipKey,
        status: video.status.value,
      },
    );

    return (result.affected ?? 0) > 0;
  }

  public async findById(id: VideoId): Promise<Video | null> {
    const entity = await this.repository.findOneBy({ id: id.value });
    return entity === null ? null : this.toDomain(entity);
  }

  public async delete(id: VideoId): Promise<void> {
    await this.repository.delete({ id: id.value });
  }

  public async findByOwnerId(
    ownerId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedVideos> {
    const [items, total] = await this.repository.findAndCount({
      where: { ownerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: items.map((entity) => this.toDomain(entity)),
      total,
    };
  }

  public async findByStatusOlderThan(status: VideoStatus, before: Date): Promise<Video[]> {
    const entities = await this.repository.find({
      where: { status: status.value, updatedAt: LessThan(before) },
      order: { createdAt: 'ASC' },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  private toDomain(entity: VideoEntity): Video {
    return Video.reconstitute({
      id: VideoId.create(entity.id),
      ownerId: entity.ownerId,
      originalName: entity.originalName,
      format: VideoFormat.create(entity.format),
      size: VideoSize.reconstitute(Number(entity.sizeBytes)),
      storageKey: entity.storageKey,
      status: VideoStatus.fromValue(entity.status),
      zipKey: entity.zipKey,
      durationMs: entity.durationMs === null ? null : Number(entity.durationMs),
    });
  }
}
