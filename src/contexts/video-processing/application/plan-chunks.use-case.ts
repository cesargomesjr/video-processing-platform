import { ChunkPlan } from '../domain/chunk-plan';
import { Chunk } from '../domain/chunk';
import { VideoProcessingError } from './errors';
import { ChunkRepository } from './ports/chunk-repository';
import { MessagePublisher } from './ports/message-publisher';
import { ProcessingVideoRepository } from './ports/processing-video-repository';

export interface PlanChunksInput {
  videoId: string;
}

export class PlanChunksUseCase {
  public constructor(
    private readonly videoRepository: ProcessingVideoRepository,
    private readonly chunkRepository: ChunkRepository,
    private readonly messagePublisher: MessagePublisher,
    private readonly chunkSeconds: number,
    private readonly maxChunks: number,
  ) {}

  public async execute(input: PlanChunksInput): Promise<void> {
    const video = await this.videoRepository.findById(input.videoId);

    if (video === null) {
      throw new VideoProcessingError(`Video not found: ${input.videoId}`);
    }

    if (video.status !== 'ANALYZED') {
      return;
    }

    if (video.durationMs === null || video.durationMs <= 0) {
      throw new VideoProcessingError(`Video has invalid duration: ${video.id}`);
    }

    const plan = ChunkPlan.create(video.durationMs, this.chunkSeconds, this.maxChunks);
    const chunks: Chunk[] = [];
    for (let index = 0; index < plan.windows.length; index += 1) {
      const window = plan.windows[index];
      if (window === undefined) {
        continue;
      }

      chunks.push(
        Chunk.create({
          videoId: video.id,
          index,
          totalChunks: plan.windows.length,
          startMs: window.startMs,
          durationMs: window.durationMs,
        }),
      );
    }

    await this.chunkRepository.saveMany(chunks);

    const claimed = await this.videoRepository.markProcessing(video.id);
    if (!claimed) {
      return;
    }

    for (const [index, window] of plan.windows.entries()) {
      await this.messagePublisher.publishProcessVideoChunk({
        videoId: video.id,
        chunkIndex: index,
        startSeconds: window.startMs / 1_000,
        durationSeconds: window.durationMs / 1_000,
        storageKey: video.storageKey,
      });
    }
  }
}
