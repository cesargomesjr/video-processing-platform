import {
  PaginatedVideos,
  VideoRepository,
} from '../../../../src/contexts/video-management/application/ports/video-repository';
import {
  ProcessingVideo,
  ProcessingVideoRepository,
  ProcessingVideoStatus,
} from '../../../../src/contexts/video-processing/application/ports/processing-video-repository';
import { Video } from '../../../../src/contexts/video-management/domain/video';
import { VideoId } from '../../../../src/contexts/video-management/domain/video-id';
import { VideoStatus } from '../../../../src/contexts/video-management/domain/video-status';

export class InMemoryVideoRepository implements VideoRepository, ProcessingVideoRepository {
  private readonly videosById = new Map<string, Video>();

  public save(video: Video): Promise<void> {
    this.videosById.set(video.id.value, video);
    return Promise.resolve();
  }

  public saveTransition(video: Video, expectedStatus: VideoStatus): Promise<boolean> {
    const current = this.videosById.get(video.id.value);
    if (current === undefined || current.status !== expectedStatus) {
      return Promise.resolve(false);
    }

    this.videosById.set(video.id.value, video);
    return Promise.resolve(true);
  }

  public findById(id: VideoId): Promise<Video | null>;
  public findById(id: string): Promise<ProcessingVideo | null>;
  public findById(id: VideoId | string): Promise<Video | ProcessingVideo | null> {
    const value = typeof id === 'string' ? id : id.value;
    const video = this.videosById.get(value) ?? null;
    if (typeof id === 'string') {
      return Promise.resolve(video === null ? null : this.toProcessingVideo(video));
    }

    return Promise.resolve(video);
  }

  public delete(id: VideoId): Promise<void> {
    this.videosById.delete(id.value);
    return Promise.resolve();
  }

  public findByOwnerId(ownerId: string, page: number, pageSize: number): Promise<PaginatedVideos> {
    const items = [...this.videosById.values()].filter((video) => video.ownerId === ownerId);
    const offset = (page - 1) * pageSize;

    return Promise.resolve({
      items: items.slice(offset, offset + pageSize),
      total: items.length,
    });
  }

  public findByStatusOlderThan(status: VideoStatus, before: Date): Promise<Video[]> {
    return Promise.resolve(
      [...this.videosById.values()].filter(
        (video) => video.status === status && before.getTime() > 0,
      ),
    );
  }

  public markAnalyzed(id: string, durationMs: number): Promise<boolean> {
    const video = this.videosById.get(id);
    if (video === undefined || video.status !== VideoStatus.PENDING) {
      return Promise.resolve(false);
    }

    video.markAnalyzed(durationMs);
    return Promise.resolve(true);
  }

  public markProcessing(id: string): Promise<boolean> {
    return this.transition(id, 'ANALYZED', VideoStatus.PROCESSING);
  }

  public markAggregating(id: string): Promise<boolean> {
    return this.transition(id, 'PROCESSING', VideoStatus.AGGREGATING);
  }

  public markCompleted(id: string, zipKey: string): Promise<boolean> {
    const video = this.videosById.get(id);
    if (video === undefined || video.status !== VideoStatus.AGGREGATING) {
      return Promise.resolve(false);
    }

    video.complete(zipKey);
    return Promise.resolve(true);
  }

  public markFailed(id: string, expectedStatus: ProcessingVideoStatus): Promise<boolean> {
    return this.transition(id, expectedStatus, VideoStatus.FAILED);
  }

  public completePending(id: string, zipKey: string): Promise<boolean> {
    const video = this.videosById.get(id);
    if (video === undefined || video.status !== VideoStatus.PENDING) {
      return Promise.resolve(false);
    }

    video.transitionTo(VideoStatus.ANALYZED);
    video.transitionTo(VideoStatus.PROCESSING);
    video.transitionTo(VideoStatus.AGGREGATING);
    video.complete(zipKey);
    return Promise.resolve(true);
  }

  private transition(
    id: string,
    expectedStatus: ProcessingVideoStatus,
    nextStatus: VideoStatus,
  ): Promise<boolean> {
    const video = this.videosById.get(id);
    if (video === undefined || video.status.value !== expectedStatus) {
      return Promise.resolve(false);
    }

    video.transitionTo(nextStatus);
    return Promise.resolve(true);
  }

  private toProcessingVideo(video: Video): ProcessingVideo {
    return {
      id: video.id.value,
      ownerId: video.ownerId,
      storageKey: video.storageKey,
      status: video.status.value,
      durationMs: video.durationMs,
      zipKey: video.zipKey,
    };
  }
}
