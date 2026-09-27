import { Video } from '../../domain/video';
import { VideoId } from '../../domain/video-id';

export interface PaginatedVideos {
  items: Video[];
  total: number;
}

export interface VideoRepository {
  save(video: Video): Promise<void>;
  findById(id: VideoId): Promise<Video | null>;
  delete(id: VideoId): Promise<void>;
  findByOwnerId(ownerId: string, page: number, pageSize: number): Promise<PaginatedVideos>;
}
