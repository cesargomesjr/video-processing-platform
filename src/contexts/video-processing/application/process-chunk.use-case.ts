import { ChunkStatus } from '../domain/chunk-status';
import { ExtractFramesSpec } from '../domain/extract-frames-spec';
import { VideoProcessingError } from './errors';
import { ChunkRepository } from './ports/chunk-repository';
import { FrameExtractor } from './ports/frame-extractor';
import { FrameStorage } from './ports/frame-storage';
import { MessagePublisher } from './ports/message-publisher';

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
    private readonly frameExtractor: FrameExtractor,
    private readonly frameStorage: FrameStorage,
    private readonly messagePublisher: MessagePublisher,
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

    let frames;
    try {
      frames = await this.frameExtractor.extract({
        storageKey: input.storageKey,
        spec,
        outputDirectory: `/tmp/${input.videoId}/${input.chunkIndex}`,
      });
    } catch {
      await this.chunkRepository.markFailed(input.videoId, input.chunkIndex);
      return;
    }

    try {
      for (const frame of frames) {
        await this.frameStorage.put(frame.key, frame.content);
      }
    } catch {
      await this.chunkRepository.markFailed(input.videoId, input.chunkIndex);
      return;
    }

    const frameCount = frames.length;
    await this.chunkRepository.markCompleted(input.videoId, input.chunkIndex, frameCount);

    await this.messagePublisher.publishChunkCompleted({
      videoId: input.videoId,
      chunkIndex: input.chunkIndex,
      frameCount,
    });
  }
}
