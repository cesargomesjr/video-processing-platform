import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { framesPrefix } from '../../../platform/storage/video-object-keys';
import { ChunkStatus } from '../domain/chunk-status';
import { ExtractFramesSpec } from '../domain/extract-frames-spec';
import { VideoProcessingError } from './errors';
import { ChunkRepository } from './ports/chunk-repository';
import { FrameExtractor } from './ports/frame-extractor';
import { FrameStorage } from './ports/frame-storage';
import { MessagePublisher } from './ports/message-publisher';
import { NoopProcessingMetrics, ProcessingMetrics } from './ports/processing-metrics';
import { VideoFileStorage } from './ports/video-file-storage';

export interface ProcessChunkInput {
  videoId: string;
  chunkIndex: number;
  startSeconds: number;
  durationSeconds: number;
  storageKey: string;
}

export class ProcessChunkUseCase {
  public constructor(
    private readonly chunkRepository: ChunkRepository,
    private readonly videoStorage: VideoFileStorage,
    private readonly frameExtractor: FrameExtractor,
    private readonly frameStorage: FrameStorage,
    private readonly messagePublisher: MessagePublisher,
    private readonly metrics: ProcessingMetrics = new NoopProcessingMetrics(),
  ) {}

  public async execute(input: ProcessChunkInput): Promise<void> {
    const chunk = await this.chunkRepository.findByVideoAndIndex(input.videoId, input.chunkIndex);

    if (chunk === null) {
      throw new VideoProcessingError(`Chunk not found: ${input.videoId}:${input.chunkIndex}`);
    }

    if (chunk.status === ChunkStatus.COMPLETED) {
      return;
    }

    const claimed = await this.chunkRepository.claim(input.videoId, input.chunkIndex);
    if (claimed === null) {
      return;
    }

    const spec = ExtractFramesSpec.create(input.startSeconds);
    const outputDirectory = `/tmp/${input.videoId}/${input.chunkIndex}`;

    let frames;
    try {
      frames = await this.withVideoFile(input.storageKey, (filePath) =>
        this.frameExtractor.extract({
          storageKey: filePath,
          spec,
          outputDirectory,
          startSeconds: input.startSeconds,
          durationSeconds: input.durationSeconds,
        }),
      );
    } catch {
      await this.chunkRepository.markFailed(input.videoId, input.chunkIndex);
      this.metrics.incrementChunks('FAILED');
      await this.messagePublisher.publishChunkFailed({
        videoId: input.videoId,
        chunkIndex: input.chunkIndex,
      });
      return;
    }

    try {
      for (const frame of frames) {
        const frameKey = `${framesPrefix(input.storageKey)}${input.chunkIndex}/${frame.key}`;
        await this.frameStorage.put(frameKey, frame.content);
      }
    } catch {
      await this.chunkRepository.markFailed(input.videoId, input.chunkIndex);
      this.metrics.incrementChunks('FAILED');
      await this.messagePublisher.publishChunkFailed({
        videoId: input.videoId,
        chunkIndex: input.chunkIndex,
      });
      return;
    }

    const frameCount = frames.length;
    await this.chunkRepository.markCompleted(input.videoId, input.chunkIndex, frameCount);
    this.metrics.incrementChunks('COMPLETED');

    await this.messagePublisher.publishChunkCompleted({
      videoId: input.videoId,
      chunkIndex: input.chunkIndex,
      frameCount,
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
