import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { VideoProcessingError } from './errors';
import { MessagePublisher } from './ports/message-publisher';
import { ProcessingVideo, ProcessingVideoRepository } from './ports/processing-video-repository';
import { VideoFileStorage } from './ports/video-file-storage';
import { VideoAnalysis, VideoAnalyzer } from './ports/video-analyzer';

export interface AnalyzeVideoInput {
  videoId: string;
}

export class AnalyzeVideoUseCase {
  public constructor(
    private readonly videoRepository: ProcessingVideoRepository,
    private readonly videoStorage: VideoFileStorage,
    private readonly videoAnalyzer: VideoAnalyzer,
    private readonly messagePublisher: MessagePublisher,
  ) {}

  public async execute(input: AnalyzeVideoInput): Promise<void> {
    const video = await this.videoRepository.findById(input.videoId);

    if (video === null) {
      throw new VideoProcessingError(`Video not found: ${input.videoId}`);
    }

    if (video.status !== 'PENDING') {
      return;
    }

    let analysis: VideoAnalysis;
    try {
      analysis = await this.withVideoFile(video.storageKey, (filePath) =>
        this.videoAnalyzer.analyze(filePath),
      );
    } catch {
      await this.markFailed(video, 'Video analysis failed');
      return;
    }

    if (!Number.isSafeInteger(analysis.durationMs) || analysis.durationMs <= 0) {
      await this.markFailed(video, 'Invalid video duration');
      return;
    }

    const analyzed = await this.videoRepository.markAnalyzed(video.id, analysis.durationMs);
    if (!analyzed) {
      return;
    }

    await this.messagePublisher.publishVideoAnalyzed({
      videoId: video.id,
      durationMs: analysis.durationMs,
      width: analysis.width,
      height: analysis.height,
      codec: analysis.codec,
    });
  }

  private async markFailed(video: ProcessingVideo, reason: string): Promise<void> {
    const failed = await this.videoRepository.markFailed(video.id, 'PENDING');
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

  private async withVideoFile<T>(
    storageKey: string,
    handler: (filePath: string) => Promise<T>,
  ): Promise<T> {
    const directory = await mkdtemp(join(tmpdir(), 'video-'));
    const filePath = join(directory, 'video.mp4');

    try {
      await writeFile(filePath, await this.videoStorage.get(storageKey));
      return await handler(filePath);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
