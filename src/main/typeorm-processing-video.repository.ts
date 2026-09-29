import { DataSource, Repository } from 'typeorm';

import {
  ProcessingVideo,
  ProcessingVideoRepository,
  ProcessingVideoStatus,
} from '../contexts/video-processing/application/ports/processing-video-repository';
import { VideoEntity } from '../contexts/video-management/infrastructure/typeorm/video.entity';

export class TypeormProcessingVideoRepository implements ProcessingVideoRepository {
  private readonly repository: Repository<VideoEntity>;

  public constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(VideoEntity);
  }

  public async findById(id: string): Promise<ProcessingVideo | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity === null ? null : this.toProcessingVideo(entity);
  }

  public async markAnalyzed(id: string, durationMs: number): Promise<boolean> {
    const result = await this.repository.update(
      { id, status: 'PENDING' },
      { status: 'ANALYZED', durationMs: BigInt(durationMs).toString() },
    );

    return (result.affected ?? 0) > 0;
  }

  public async markProcessing(id: string): Promise<boolean> {
    return this.updateStatus(id, 'ANALYZED', 'PROCESSING');
  }

  public async markAggregating(id: string): Promise<boolean> {
    return this.updateStatus(id, 'PROCESSING', 'AGGREGATING');
  }

  public async markCompleted(id: string, zipKey: string): Promise<boolean> {
    const result = await this.repository.update(
      { id, status: 'AGGREGATING' },
      { status: 'COMPLETED', zipKey },
    );

    return (result.affected ?? 0) > 0;
  }

  public async markFailed(id: string, expectedStatus: ProcessingVideoStatus): Promise<boolean> {
    const result = await this.repository.update(
      { id, status: expectedStatus },
      { status: 'FAILED', zipKey: null },
    );

    return (result.affected ?? 0) > 0;
  }

  public async completePending(id: string, zipKey: string): Promise<boolean> {
    const result = await this.repository.update(
      { id, status: 'PENDING' },
      { status: 'COMPLETED', zipKey },
    );

    return (result.affected ?? 0) > 0;
  }

  private async updateStatus(
    id: string,
    expectedStatus: ProcessingVideoStatus,
    nextStatus: ProcessingVideoStatus,
  ): Promise<boolean> {
    const result = await this.repository.update(
      { id, status: expectedStatus },
      { status: nextStatus },
    );

    return (result.affected ?? 0) > 0;
  }

  private toProcessingVideo(entity: VideoEntity): ProcessingVideo {
    return {
      id: entity.id,
      ownerId: entity.ownerId,
      storageKey: entity.storageKey,
      status: entity.status,
      durationMs: entity.durationMs === null ? null : Number(entity.durationMs),
      zipKey: entity.zipKey,
    };
  }
}
