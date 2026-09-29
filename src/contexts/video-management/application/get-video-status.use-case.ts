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
  originalName: string;
  format: string;
  sizeBytes: number;
  durationMs: number | null;
  progress: number;
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

    return {
      videoId: video.id.value,
      status: video.status.value,
      originalName: video.originalName,
      format: video.format.value,
      sizeBytes: video.size.bytes,
      durationMs: video.durationMs,
      progress: this.progressFor(video.status.value),
    };
  }

  private progressFor(status: VideoStatusValue): number {
    switch (status) {
      case 'PENDING':
        return 10;
      case 'ANALYZED':
        return 30;
      case 'PROCESSING':
        return 65;
      case 'AGGREGATING':
        return 85;
      case 'COMPLETED':
      case 'FAILED':
        return 100;
    }
  }
}
