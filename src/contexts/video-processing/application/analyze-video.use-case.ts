import { VideoRepository } from '../../video-management/application/ports/video-repository';
import { VideoId } from '../../video-management/domain/video-id';
import { VideoStatus } from '../../video-management/domain/video-status';
import { VideoProcessingError } from './errors';
import { MessagePublisher } from './ports/message-publisher';
import { VideoAnalyzer } from './ports/video-analyzer';

export interface AnalyzeVideoInput {
  videoId: string;
}

export class AnalyzeVideoUseCase {
  public constructor(
    private readonly videoRepository: VideoRepository,
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

    let analysis;
    try {
      analysis = await this.videoAnalyzer.analyze(video.storageKey);
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
}
