import { AnalyzeVideoUseCase } from '../../../src/contexts/video-processing/application/analyze-video.use-case';
import { VideoProcessingError } from '../../../src/contexts/video-processing/application/errors';
import {
  VideoAnalysis,
  VideoAnalyzer,
} from '../../../src/contexts/video-processing/application/ports/video-analyzer';
import {
  MessagePublisher,
  ChunkCompletedEvent,
  ProcessVideoChunkEvent,
  VideoAnalyzedEvent,
} from '../../../src/contexts/video-processing/application/ports/message-publisher';
import { Video } from '../../../src/contexts/video-management/domain/video';
import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoSize } from '../../../src/contexts/video-management/domain/video-size';
import { VideoStatus } from '../../../src/contexts/video-management/domain/video-status';
import { InMemoryVideoRepository } from '../video-management/fakes/in-memory-video-repository';

const base = {
  id: VideoId.create('video-1'),
  ownerId: 'user-1',
  originalName: 'movie.mp4',
  format: VideoFormat.create('mp4'),
  size: VideoSize.create(1024, 1024 * 1024),
  storageKey: 'original/user-1/video-1.mp4',
};

class FakeVideoAnalyzer implements VideoAnalyzer {
  public result: VideoAnalysis = {
    durationMs: 10_000,
    width: 1920,
    height: 1080,
    codec: 'h264',
  };
  public shouldThrow = false;
  public calls = 0;
  public lastStorageKey: string | null = null;

  public analyze(storageKey: string): Promise<VideoAnalysis> {
    this.calls += 1;
    this.lastStorageKey = storageKey;

    if (this.shouldThrow) {
      return Promise.reject(new Error('analysis failed'));
    }

    return Promise.resolve(this.result);
  }
}

class FakeMessagePublisher implements MessagePublisher {
  public readonly published: VideoAnalyzedEvent[] = [];
  public readonly processed: ProcessVideoChunkEvent[] = [];
  public readonly completed: ChunkCompletedEvent[] = [];

  public publishVideoAnalyzed(event: VideoAnalyzedEvent): Promise<void> {
    this.published.push(event);
    return Promise.resolve();
  }

  public publishProcessVideoChunk(event: ProcessVideoChunkEvent): Promise<void> {
    this.processed.push(event);
    return Promise.resolve();
  }

  public publishChunkCompleted(event: ChunkCompletedEvent): Promise<void> {
    this.completed.push(event);
    return Promise.resolve();
  }
}

describe('AnalyzeVideoUseCase', () => {
  let repository: InMemoryVideoRepository;
  let analyzer: FakeVideoAnalyzer;
  let publisher: FakeMessagePublisher;
  let useCase: AnalyzeVideoUseCase;

  beforeEach(() => {
    repository = new InMemoryVideoRepository();
    analyzer = new FakeVideoAnalyzer();
    publisher = new FakeMessagePublisher();
    useCase = new AnalyzeVideoUseCase(repository, analyzer, publisher);
  });

  it('analyzes a pending video and publishes VideoAnalyzed', async () => {
    await repository.save(Video.create(base));

    await useCase.execute({ videoId: 'video-1' });

    const saved = await repository.findById(VideoId.create('video-1'));
    expect(saved?.status).toBe(VideoStatus.ANALYZED);
    expect(saved?.durationMs).toBe(10_000);
    expect(publisher.published).toEqual([
      {
        videoId: 'video-1',
        durationMs: 10_000,
        width: 1920,
        height: 1080,
        codec: 'h264',
      },
    ]);
  });

  it('marks the video as FAILED when the duration is invalid', async () => {
    analyzer.result = { durationMs: 0, width: 1920, height: 1080, codec: 'h264' };
    await repository.save(Video.create(base));

    await useCase.execute({ videoId: 'video-1' });

    const saved = await repository.findById(VideoId.create('video-1'));
    expect(saved?.status).toBe(VideoStatus.FAILED);
    expect(publisher.published).toHaveLength(0);
  });

  it('marks the video as FAILED when analysis throws', async () => {
    analyzer.shouldThrow = true;
    await repository.save(Video.create(base));

    await useCase.execute({ videoId: 'video-1' });

    const saved = await repository.findById(VideoId.create('video-1'));
    expect(saved?.status).toBe(VideoStatus.FAILED);
    expect(publisher.published).toHaveLength(0);
  });

  it('throws when the video does not exist', async () => {
    await expect(useCase.execute({ videoId: 'missing' })).rejects.toThrow(VideoProcessingError);
  });

  it('does nothing for an already analyzed video', async () => {
    const analyzed = Video.reconstitute({
      ...base,
      status: VideoStatus.ANALYZED,
      zipKey: null,
      durationMs: 10_000,
    });
    await repository.save(analyzed);

    await useCase.execute({ videoId: 'video-1' });

    expect(analyzer.calls).toBe(0);
    expect(publisher.published).toHaveLength(0);
  });
});
