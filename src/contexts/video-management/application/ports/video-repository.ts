import { Video } from '../../domain/video';
import { VideoId } from '../../domain/video-id';
import { VideoStatus } from '../../domain/video-status';

export interface PaginatedVideos {
  items: Video[];
  total: number;
}

export interface VideoRepository {
  save(video: Video): Promise<void>;
  findById(id: VideoId): Promise<Video | null>;
  delete(id: VideoId): Promise<void>;
  findByOwnerId(ownerId: string, page: number, pageSize: number): Promise<PaginatedVideos>;
  findByStatusOlderThan(status: VideoStatus, before: Date): Promise<Video[]>;
}
