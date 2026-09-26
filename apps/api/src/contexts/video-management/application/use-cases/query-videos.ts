import { VideoNotFoundError } from '../errors/video-errors.js';
import type {
  VideoRepository,
  VideoCursor,
  VideoPage,
} from '../ports/video-ports.js';
import type { Video } from '../../domain/video.js';
import type { VideoId, VideoOwnerId } from '../../domain/video-id.js';

export class ListUserVideos {
  public constructor(private readonly videoRepository: VideoRepository) {}

  public execute(
    input: Readonly<{
      ownerId: VideoOwnerId;
      limit: number;
      cursor: VideoCursor | null;
    }>,
  ): Promise<VideoPage> {
    return this.videoRepository.listOwned(
      input.ownerId,
      input.limit,
      input.cursor,
    );
  }
}

export class GetUserVideo {
  public constructor(private readonly videoRepository: VideoRepository) {}

  public async execute(
    ownerId: VideoOwnerId,
    videoId: VideoId,
  ): Promise<Video> {
    const video = await this.videoRepository.findOwnedById(ownerId, videoId);

    if (video === null) {
      throw new VideoNotFoundError();
    }

    return video;
  }
}
