import {
  PaginatedVideos,
  VideoRepository,
} from '../../../../src/contexts/video-management/application/ports/video-repository';
import { Video } from '../../../../src/contexts/video-management/domain/video';
import { VideoId } from '../../../../src/contexts/video-management/domain/video-id';
import { VideoStatus } from '../../../../src/contexts/video-management/domain/video-status';

export class InMemoryVideoRepository implements VideoRepository {
  private readonly videosById = new Map<string, Video>();

  public save(video: Video): Promise<void> {
    this.videosById.set(video.id.value, video);
    return Promise.resolve();
  }

  public findById(id: VideoId): Promise<Video | null> {
    return Promise.resolve(this.videosById.get(id.value) ?? null);
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
}
