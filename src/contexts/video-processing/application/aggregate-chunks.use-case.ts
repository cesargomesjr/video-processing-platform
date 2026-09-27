import { VideoRepository } from '../../video-management/application/ports/video-repository';
import { VideoId } from '../../video-management/domain/video-id';
import { VideoStatus } from '../../video-management/domain/video-status';
import { ChunkCompletionPolicy } from '../domain/chunk-completion-policy';
import { ChunkStatus } from '../domain/chunk-status';
import { VideoProcessingError } from './errors';
import { ChunkRepository } from './ports/chunk-repository';
import { MessagePublisher } from './ports/message-publisher';

export interface AggregateChunksInput {
  videoId: string;
}

export class AggregateChunksUseCase {
  public constructor(
    private readonly videoRepository: VideoRepository,
    private readonly chunkRepository: ChunkRepository,
    private readonly completionPolicy: ChunkCompletionPolicy,
    private readonly messagePublisher: MessagePublisher,
  ) {}

  public async execute(input: AggregateChunksInput): Promise<void> {
    const id = VideoId.create(input.videoId);
    const video = await this.videoRepository.findById(id);

    if (video === null) {
      throw new VideoProcessingError(`Video not found: ${input.videoId}`);
    }

    if (video.status !== VideoStatus.PROCESSING) {
      return;
    }

    const chunks = await this.chunkRepository.findByVideoId(input.videoId);
    if (chunks.length === 0) {
      return;
    }

    const failed = chunks.find((chunk) => chunk.status === ChunkStatus.FAILED);
    if (failed !== undefined) {
      video.transitionTo(VideoStatus.FAILED);
      await this.videoRepository.save(video);
      await this.messagePublisher.publishVideoProcessingFailed({
        videoId: video.id.value,
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

    video.transitionTo(VideoStatus.AGGREGATING);
    await this.videoRepository.save(video);

    const totalFrames = chunks.reduce((sum, chunk) => sum + (chunk.frameCount ?? 0), 0);
    await this.messagePublisher.publishAllChunksCompleted({
      videoId: video.id.value,
      totalChunks: chunks.length,
      totalFrames,
    });
  }
}
