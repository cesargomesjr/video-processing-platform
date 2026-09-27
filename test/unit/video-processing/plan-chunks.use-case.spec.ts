import { PlanChunksUseCase } from '../../../src/contexts/video-processing/application/plan-chunks.use-case';
import { VideoProcessingError } from '../../../src/contexts/video-processing/application/errors';
import { ChunkRepository } from '../../../src/contexts/video-processing/application/ports/chunk-repository';
import {
  MessagePublisher,
  ChunkCompletedEvent,
  ProcessVideoChunkEvent,
  VideoAnalyzedEvent,
} from '../../../src/contexts/video-processing/application/ports/message-publisher';
import { Chunk } from '../../../src/contexts/video-processing/domain/chunk';
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

class InMemoryChunkRepository implements ChunkRepository {
  public readonly chunks: Chunk[] = [];

  public saveMany(chunks: readonly Chunk[]): Promise<void> {
    const existing = new Set(this.chunks.map((chunk) => `${chunk.videoId}:${chunk.index}`));

    for (const chunk of chunks) {
      const key = `${chunk.videoId}:${chunk.index}`;
      if (!existing.has(key)) {
        this.chunks.push(chunk);
        existing.add(key);
      }
    }

    return Promise.resolve();
  }

  public findByVideoAndIndex(videoId: string, index: number): Promise<Chunk | null> {
    const chunk = this.chunks.find((item) => item.videoId === videoId && item.index === index);
    return Promise.resolve(chunk ?? null);
  }

  public claim(videoId: string, index: number): Promise<Chunk | null> {
    const chunk = this.chunks.find((item) => item.videoId === videoId && item.index === index);
    if (chunk === undefined) {
      return Promise.resolve(null);
    }

    try {
      chunk.markAsProcessing();
      return Promise.resolve(chunk);
    } catch {
      return Promise.resolve(null);
    }
  }

  public markCompleted(videoId: string, index: number, frameCount: number): Promise<void> {
    const chunk = this.chunks.find((item) => item.videoId === videoId && item.index === index);
    chunk?.markAsCompleted(frameCount);
    return Promise.resolve();
  }

  public markFailed(videoId: string, index: number): Promise<void> {
    const chunk = this.chunks.find((item) => item.videoId === videoId && item.index === index);
    chunk?.markAsFailed();
    return Promise.resolve();
  }
}

class FakeMessagePublisher implements MessagePublisher {
  public readonly processed: ProcessVideoChunkEvent[] = [];
  public readonly analyzed: VideoAnalyzedEvent[] = [];
  public readonly completed: ChunkCompletedEvent[] = [];

  public publishProcessVideoChunk(event: ProcessVideoChunkEvent): Promise<void> {
    this.processed.push(event);
    return Promise.resolve();
  }

  public publishVideoAnalyzed(event: VideoAnalyzedEvent): Promise<void> {
    this.analyzed.push(event);
    return Promise.resolve();
  }

  public publishChunkCompleted(event: ChunkCompletedEvent): Promise<void> {
    this.completed.push(event);
    return Promise.resolve();
  }
}

describe('PlanChunksUseCase', () => {
  let repository: InMemoryVideoRepository;
  let chunkRepository: InMemoryChunkRepository;
  let publisher: FakeMessagePublisher;
  let useCase: PlanChunksUseCase;

  beforeEach(() => {
    repository = new InMemoryVideoRepository();
    chunkRepository = new InMemoryChunkRepository();
    publisher = new FakeMessagePublisher();
    useCase = new PlanChunksUseCase(repository, chunkRepository, publisher, 10, 100);
  });

  it('plans and publishes chunks for an analyzed video', async () => {
    const analyzed = Video.reconstitute({
      ...base,
      status: VideoStatus.ANALYZED,
      zipKey: null,
      durationMs: 11_000,
    });
    await repository.save(analyzed);

    await useCase.execute({ videoId: 'video-1' });

    const saved = await repository.findById(VideoId.create('video-1'));
    expect(saved?.status).toBe(VideoStatus.PROCESSING);
    expect(chunkRepository.chunks).toHaveLength(2);
    expect(publisher.processed).toEqual([
      {
        videoId: 'video-1',
        chunkIndex: 0,
        startSeconds: 0,
        durationSeconds: 10,
        storageKey: 'original/user-1/video-1.mp4',
      },
      {
        videoId: 'video-1',
        chunkIndex: 1,
        startSeconds: 10,
        durationSeconds: 1,
        storageKey: 'original/user-1/video-1.mp4',
      },
    ]);
  });

  it('is idempotent across repeated runs', async () => {
    const analyzed = Video.reconstitute({
      ...base,
      status: VideoStatus.ANALYZED,
      zipKey: null,
      durationMs: 20_000,
    });
    await repository.save(analyzed);

    await useCase.execute({ videoId: 'video-1' });
    await useCase.execute({ videoId: 'video-1' });

    expect(chunkRepository.chunks).toHaveLength(2);
    expect(publisher.processed).toHaveLength(2);
  });

  it('does nothing for a video that is not analyzed', async () => {
    await repository.save(Video.create(base));

    await useCase.execute({ videoId: 'video-1' });

    expect(chunkRepository.chunks).toHaveLength(0);
    expect(publisher.processed).toHaveLength(0);
  });

  it('throws when the duration is missing', async () => {
    const analyzed = Video.reconstitute({
      ...base,
      status: VideoStatus.ANALYZED,
      zipKey: null,
      durationMs: null,
    });
    await repository.save(analyzed);

    await expect(useCase.execute({ videoId: 'video-1' })).rejects.toThrow(VideoProcessingError);
  });

  it('throws when the video does not exist', async () => {
    await expect(useCase.execute({ videoId: 'missing' })).rejects.toThrow(VideoProcessingError);
  });
});
