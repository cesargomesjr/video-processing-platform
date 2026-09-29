import { VideoId } from '../domain/video-id';
import { VideoOwnershipPolicy } from '../domain/video-ownership-policy';
import { VideoStatus } from '../domain/video-status';
import { VideoNotCompletedError, VideoNotFoundError } from './errors';
import { SignedUrlGenerator } from './ports/signed-url-generator';
import { VideoRepository } from './ports/video-repository';

export interface RequestDownloadInput {
  videoId: string;
  userId: string;
}

export interface DownloadUrl {
  url: string;
  expiresAt: Date;
}

export class RequestDownloadUseCase {
  public constructor(
    private readonly videoRepository: VideoRepository,
    private readonly ownershipPolicy: VideoOwnershipPolicy,
    private readonly signedUrlGenerator: SignedUrlGenerator,
    private readonly expiresInSeconds: number,
  ) {}

  public async execute(input: RequestDownloadInput): Promise<DownloadUrl> {
    const id = VideoId.create(input.videoId);
    const video = await this.videoRepository.findById(id);

    if (video === null) {
      throw new VideoNotFoundError();
    }

    this.ownershipPolicy.assertCanAccess(video, input.userId);

    const zipKey = video.zipKey;
    if (video.status !== VideoStatus.COMPLETED || zipKey === null) {
      throw new VideoNotCompletedError(video.status.value);
    }

    return this.signedUrlGenerator.generate(zipKey, this.expiresInSeconds);
  }
}
