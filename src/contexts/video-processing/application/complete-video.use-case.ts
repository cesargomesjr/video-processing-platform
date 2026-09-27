import { VideoRepository } from '../../video-management/application/ports/video-repository';
import { VideoStorage } from '../../video-management/application/ports/video-storage';
import { Video } from '../../video-management/domain/video';
import { VideoId } from '../../video-management/domain/video-id';
import { VideoStatus } from '../../video-management/domain/video-status';
import { VideoProcessingError } from './errors';

// Minimal valid empty ZIP archive (end of central directory only).
const EMPTY_ZIP = Buffer.from([
  0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

export class CompleteVideoUseCase {
  public constructor(
    private readonly videoRepository: VideoRepository,
    private readonly videoStorage: VideoStorage,
  ) {}

  public async execute(videoId: string): Promise<void> {
    const id = VideoId.create(videoId);
    const video = await this.videoRepository.findById(id);

    if (video === null) {
      throw new VideoProcessingError(`Video not found: ${videoId}`);
    }

    if (video.status === VideoStatus.COMPLETED) {
      return;
    }

    if (video.status !== VideoStatus.PENDING) {
      throw new VideoProcessingError(`Video is not pending: ${video.status.value}`);
    }

    const zipKey = `archives/${video.id.value}.zip`;
    await this.videoStorage.put(zipKey, EMPTY_ZIP);

    this.transitionThroughProcessing(video);
    video.complete(zipKey);

    await this.videoRepository.save(video);
  }

  private transitionThroughProcessing(video: Video): void {
    video.transitionTo(VideoStatus.ANALYZED);
    video.transitionTo(VideoStatus.PROCESSING);
    video.transitionTo(VideoStatus.AGGREGATING);
  }
}
