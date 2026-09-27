import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { VideoRepository } from '../../video-management/application/ports/video-repository';
import { VideoStorage } from '../../video-management/application/ports/video-storage';
import { VideoId } from '../../video-management/domain/video-id';
import { VideoStatus } from '../../video-management/domain/video-status';
import { VideoProcessingError } from './errors';
import { MessagePublisher } from './ports/message-publisher';
import { VideoAnalysis, VideoAnalyzer } from './ports/video-analyzer';

export interface AnalyzeVideoInput {
  videoId: string;
}

export class AnalyzeVideoUseCase {
  public constructor(
    private readonly videoRepository: VideoRepository,
    private readonly videoStorage: VideoStorage,
    private readonly videoAnalyzer: VideoAnalyzer,
    private readonly messagePublisher: MessagePublisher,
  ) {}

  public async execute(input: AnalyzeVideoInput): Promise<void> {
    const id = VideoId.create(input.videoId);
    const video = await this.videoRepository.findById(id);

    if (video === null) {
      throw new VideoProcessingError(`Video not found: ${input.videoId}`);
    }

    if (video.status !== VideoStatus.PENDING) {
      return;
    }

    let analysis: VideoAnalysis;
    try {
      analysis = await this.withVideoFile(video.storageKey, (filePath) =>
        this.videoAnalyzer.analyze(filePath),
      );
    } catch {
      video.transitionTo(VideoStatus.FAILED);
      await this.videoRepository.saveTransition(video, VideoStatus.PENDING);
      return;
    }

    if (!Number.isSafeInteger(analysis.durationMs) || analysis.durationMs <= 0) {
      video.transitionTo(VideoStatus.FAILED);
      await this.videoRepository.saveTransition(video, VideoStatus.PENDING);
      return;
    }

    video.markAnalyzed(analysis.durationMs);
    const analyzed = await this.videoRepository.saveTransition(video, VideoStatus.PENDING);
    if (!analyzed) {
      return;
    }

    await this.messagePublisher.publishVideoAnalyzed({
      videoId: video.id.value,
      durationMs: analysis.durationMs,
      width: analysis.width,
      height: analysis.height,
      codec: analysis.codec,
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
