import { archiveKey } from '../../../platform/storage/video-object-keys';
import { VideoProcessingError } from './errors';
import { ProcessingVideoRepository } from './ports/processing-video-repository';
import { VideoFileStorage } from './ports/video-file-storage';

// Minimal valid empty ZIP archive (end of central directory only).
const EMPTY_ZIP = Buffer.from([
  0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

export class CompleteVideoUseCase {
  public constructor(
    private readonly videoRepository: ProcessingVideoRepository,
    private readonly videoStorage: VideoFileStorage,
  ) {}

  public async execute(videoId: string): Promise<void> {
    const video = await this.videoRepository.findById(videoId);

    if (video === null) {
      throw new VideoProcessingError(`Video not found: ${videoId}`);
    }

    if (video.status === 'COMPLETED') {
      return;
    }

    if (video.status !== 'PENDING') {
      throw new VideoProcessingError(`Video is not pending: ${video.status}`);
    }

    const zipKey = archiveKey(video.storageKey);
    await this.videoStorage.put(zipKey, EMPTY_ZIP);

    await this.videoRepository.completePending(video.id, zipKey);
  }
}
