import { ChunkCompletionPolicy } from '../domain/chunk-completion-policy';
import { ChunkStatus } from '../domain/chunk-status';
import { VideoProcessingError } from './errors';
import { ChunkRepository } from './ports/chunk-repository';
import { MessagePublisher } from './ports/message-publisher';
import { ProcessingVideoRepository } from './ports/processing-video-repository';

export interface AggregateChunksInput {
  videoId: string;
}

export class AggregateChunksUseCase {
  public constructor(
    private readonly videoRepository: ProcessingVideoRepository,
    private readonly chunkRepository: ChunkRepository,
    private readonly completionPolicy: ChunkCompletionPolicy,
    private readonly messagePublisher: MessagePublisher,
  ) {}

  public async execute(input: AggregateChunksInput): Promise<void> {
    const video = await this.videoRepository.findById(input.videoId);

    if (video === null) {
      throw new VideoProcessingError(`Video not found: ${input.videoId}`);
    }

    if (video.status !== 'PROCESSING') {
      return;
    }

    const chunks = await this.chunkRepository.findByVideoId(input.videoId);
    if (chunks.length === 0) {
      return;
    }

    const failed = chunks.find((chunk) => chunk.status === ChunkStatus.FAILED);
    if (failed !== undefined) {
      const failedUpdate = await this.videoRepository.markFailed(video.id, 'PROCESSING');
      if (!failedUpdate) {
        return;
      }

      await this.messagePublisher.publishVideoProcessingFailed({
        videoId: video.id,
        ownerId: video.ownerId,
        reason: `Chunk ${failed.index} failed`,
        failedAt: new Date(),
      });
      return;
    }

    try {
      this.completionPolicy.assertAllCompleted(chunks);
    } catch {
      return;
    }

    const aggregated = await this.videoRepository.markAggregating(video.id);
    if (!aggregated) {
      return;
    }

    const totalFrames = chunks.reduce((sum, chunk) => sum + (chunk.frameCount ?? 0), 0);
    await this.messagePublisher.publishAllChunksCompleted({
      videoId: video.id,
      totalChunks: chunks.length,
      totalFrames,
    });
  }
}
