import { VideoRepository } from '../../video-management/application/ports/video-repository';
import { VideoStorage } from '../../video-management/application/ports/video-storage';
import { Video } from '../../video-management/domain/video';
import { VideoId } from '../../video-management/domain/video-id';
import { VideoStatus } from '../../video-management/domain/video-status';
import { VideoProcessingError } from './errors';
import { ArchiveBuilder } from './ports/archive-builder';
import { FrameStorage } from './ports/frame-storage';
import { MessagePublisher } from './ports/message-publisher';

export interface PackageArchiveInput {
  videoId: string;
}

export class PackageArchiveUseCase {
  public constructor(
    private readonly videoRepository: VideoRepository,
    private readonly frameStorage: FrameStorage,
    private readonly archiveBuilder: ArchiveBuilder,
    private readonly videoStorage: VideoStorage,
    private readonly messagePublisher: MessagePublisher,
  ) {}

  public async execute(input: PackageArchiveInput): Promise<void> {
    const id = VideoId.create(input.videoId);
    const video = await this.videoRepository.findById(id);

    if (video === null) {
      throw new VideoProcessingError(`Video not found: ${input.videoId}`);
    }

    if (video.status !== VideoStatus.AGGREGATING) {
      return;
    }

    const prefix = `frames/${input.videoId}/`;

    let keys;
    try {
      keys = await this.frameStorage.list(prefix);
    } catch {
      await this.markFailed(video);
      return;
    }

    keys.sort();

    try {
      const files = await Promise.all(
        keys.map(async (key) => ({
          key,
          content: await this.frameStorage.get(key),
        })),
      );
      const zipBuffer = await this.archiveBuilder.build(files);
      const zipKey = `archives/${video.id.value}.zip`;

      await this.videoStorage.put(zipKey, zipBuffer);

      video.complete(zipKey);
      await this.videoRepository.save(video);

      await this.messagePublisher.publishVideoCompleted({
        videoId: video.id.value,
        zipKey,
        frameCount: files.length,
      });
    } catch {
      await this.markFailed(video);
    }
  }

  private async markFailed(video: Video): Promise<void> {
    video.transitionTo(VideoStatus.FAILED);
    await this.videoRepository.save(video);
  }
}
