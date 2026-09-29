import { VideoStatus } from '../domain/video-status';
import { MessagePublisher } from './ports/message-publisher';
import { VideoRepository } from './ports/video-repository';

export class RepublishPendingVideosUseCase {
  public constructor(
    private readonly videoRepository: VideoRepository,
    private readonly messagePublisher: MessagePublisher,
  ) {}

  public async execute(before: Date): Promise<number> {
    const videos = await this.videoRepository.findByStatusOlderThan(VideoStatus.PENDING, before);

    for (const video of videos) {
      await this.messagePublisher.publishVideoUploaded({
        videoId: video.id.value,
        ownerId: video.ownerId,
        storageKey: video.storageKey,
        format: video.format.value,
        sizeBytes: video.size.bytes,
      });
    }

    return videos.length;
  }
}
