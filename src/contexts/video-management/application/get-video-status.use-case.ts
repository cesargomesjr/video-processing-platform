import { VideoId } from '../domain/video-id';
import { VideoOwnershipPolicy } from '../domain/video-ownership-policy';
import { VideoStatusValue } from '../domain/video-status';
import { VideoNotFoundError } from './errors';
import { VideoRepository } from './ports/video-repository';

export interface GetVideoStatusInput {
  videoId: string;
  userId: string;
}

export interface VideoStatusView {
  videoId: string;
  status: VideoStatusValue;
}

export class GetVideoStatusUseCase {
  public constructor(
    private readonly videoRepository: VideoRepository,
    private readonly ownershipPolicy: VideoOwnershipPolicy,
  ) {}

  public async execute(input: GetVideoStatusInput): Promise<VideoStatusView> {
    const id = VideoId.create(input.videoId);
    const video = await this.videoRepository.findById(id);

    if (video === null) {
      throw new VideoNotFoundError();
    }

    this.ownershipPolicy.assertCanAccess(video, input.userId);

    return { videoId: video.id.value, status: video.status.value };
  }
}
