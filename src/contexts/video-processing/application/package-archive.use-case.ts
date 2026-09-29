import { posix } from 'node:path';

import {
  archiveKey,
  framesPrefix,
  videoRootFromStorageKey,
} from '../../../platform/storage/video-object-keys';
import { VideoProcessingError } from './errors';
import { ArchiveBuilder } from './ports/archive-builder';
import { FrameStorage } from './ports/frame-storage';
import { MessagePublisher } from './ports/message-publisher';
import { ProcessingVideo, ProcessingVideoRepository } from './ports/processing-video-repository';
import { VideoFileStorage } from './ports/video-file-storage';

export interface PackageArchiveInput {
  videoId: string;
}

export class PackageArchiveUseCase {
  public constructor(
    private readonly videoRepository: ProcessingVideoRepository,
    private readonly frameStorage: FrameStorage,
    private readonly archiveBuilder: ArchiveBuilder,
    private readonly videoStorage: VideoFileStorage,
    private readonly messagePublisher: MessagePublisher,
  ) {}

  public async execute(input: PackageArchiveInput): Promise<void> {
    const video = await this.videoRepository.findById(input.videoId);

    if (video === null) {
      throw new VideoProcessingError(`Video not found: ${input.videoId}`);
    }

    if (video.status !== 'AGGREGATING') {
      return;
    }

    const root = videoRootFromStorageKey(video.storageKey);
    const prefix = framesPrefix(video.storageKey);

    let keys;
    try {
      keys = await this.frameStorage.list(prefix);
    } catch {
      await this.markFailed(video, 'Frame listing failed');
      return;
    }

    keys.sort();

    try {
      const files = await Promise.all(
        keys.map(async (key) => ({
          key: posix.relative(root, key),
          content: await this.frameStorage.get(key),
        })),
      );
      const zipBuffer = await this.archiveBuilder.build(files);
      const zipKey = archiveKey(video.storageKey);

      await this.videoStorage.put(zipKey, zipBuffer);

      const completed = await this.videoRepository.markCompleted(video.id, zipKey);
      if (!completed) {
        return;
      }

      await this.messagePublisher.publishVideoCompleted({
        videoId: video.id,
        ownerId: video.ownerId,
        zipKey,
        frameCount: files.length,
      });
    } catch {
      await this.markFailed(video, 'Archive packaging failed');
    }
  }

  private async markFailed(video: ProcessingVideo, reason: string): Promise<void> {
    const failed = await this.videoRepository.markFailed(video.id, 'AGGREGATING');
    if (!failed) {
      return;
    }

    await this.messagePublisher.publishVideoProcessingFailed({
      videoId: video.id,
      ownerId: video.ownerId,
      reason,
      failedAt: new Date(),
    });
  }
}
