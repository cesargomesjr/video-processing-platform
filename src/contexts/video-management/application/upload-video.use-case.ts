import { Video } from '../domain/video';
import { VideoFormat } from '../domain/video-format';
import { VideoId } from '../domain/video-id';
import { VideoSize } from '../domain/video-size';
import { VideoStatusValue } from '../domain/video-status';
import { VideoContentMismatchError, VideoStorageWriteError, VideoTooLargeError } from './errors';
import { IdGenerator } from './ports/id-generator';
import { MessagePublisher } from './ports/message-publisher';
import { VideoContentInspector } from './ports/video-content-inspector';
import { VideoRepository } from './ports/video-repository';
import { VideoStorage } from './ports/video-storage';

export interface UploadVideoInput {
  ownerId: string;
  originalName: string;
  content: Buffer;
}

export interface UploadVideoResult {
  videoId: string;
  status: VideoStatusValue;
}

export class UploadVideoUseCase {
  public constructor(
    private readonly videoRepository: VideoRepository,
    private readonly videoStorage: VideoStorage,
    private readonly messagePublisher: MessagePublisher,
    private readonly contentInspector: VideoContentInspector,
    private readonly idGenerator: IdGenerator,
    private readonly maxBytes: number,
  ) {}

  public async execute(input: UploadVideoInput): Promise<UploadVideoResult> {
    const format = VideoFormat.create(this.extractExtension(input.originalName));

    if (input.content.length > this.maxBytes) {
      throw new VideoTooLargeError(input.content.length, this.maxBytes);
    }
    const size = VideoSize.create(input.content.length, this.maxBytes);

    const contentMatches = await this.contentInspector.matchesFormat(input.content, format);
    if (!contentMatches) {
      throw new VideoContentMismatchError(format.value);
    }

    const videoId = VideoId.create(this.idGenerator.next());
    const storageKey = `original/${input.ownerId}/${videoId.value}${format.extension}`;

    const video = Video.create({
      id: videoId,
      ownerId: input.ownerId,
      originalName: input.originalName,
      format,
      size,
      storageKey,
    });

    await this.videoRepository.save(video);

    try {
      await this.videoStorage.put(storageKey, input.content);
    } catch {
      await this.videoRepository.delete(video.id);
      throw new VideoStorageWriteError();
    }

    try {
      await this.messagePublisher.publishVideoUploaded({
        videoId: video.id.value,
        ownerId: video.ownerId,
        storageKey,
        format: format.value,
        sizeBytes: size.bytes,
      });
    } catch {
      // The video stays PENDING and a rescan job republishes undelivered events.
    }

    return { videoId: video.id.value, status: video.status.value };
  }

  private extractExtension(originalName: string): string {
    const lastDot = originalName.lastIndexOf('.');
    return lastDot < 0 ? '' : originalName.slice(lastDot);
  }
}
