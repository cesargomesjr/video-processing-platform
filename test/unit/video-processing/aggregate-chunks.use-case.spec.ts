import { AggregateChunksUseCase } from '../../../src/contexts/video-processing/application/aggregate-chunks.use-case';
import { VideoProcessingError } from '../../../src/contexts/video-processing/application/errors';
import { ChunkRepository } from '../../../src/contexts/video-processing/application/ports/chunk-repository';
import {
  AllChunksCompletedEvent,
  ChunkCompletedEvent,
  MessagePublisher,
  ProcessVideoChunkEvent,
  VideoAnalyzedEvent,
  VideoCompletedEvent,
} from '../../../src/contexts/video-processing/application/ports/message-publisher';
import { Chunk } from '../../../src/contexts/video-processing/domain/chunk';
import { ChunkCompletionPolicy } from '../../../src/contexts/video-processing/domain/chunk-completion-policy';
import { ChunkStatus } from '../../../src/contexts/video-processing/domain/chunk-status';
import { Video } from '../../../src/contexts/video-management/domain/video';
import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoSize } from '../../../src/contexts/video-management/domain/video-size';
import { VideoStatus } from '../../../src/contexts/video-management/domain/video-status';
import { InMemoryVideoRepository } from '../video-management/fakes/in-memory-video-repository';

const videoBase = {
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

  public findByVideoId(videoId: string): Promise<Chunk[]> {
    return Promise.resolve(this.chunks.filter((chunk) => chunk.videoId === videoId));
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
  public readonly analyzed: VideoAnalyzedEvent[] = [];
  public readonly processed: ProcessVideoChunkEvent[] = [];
  public readonly completed: ChunkCompletedEvent[] = [];
  public readonly all: AllChunksCompletedEvent[] = [];
  public readonly videoCompleted: VideoCompletedEvent[] = [];

  public publishVideoAnalyzed(event: VideoAnalyzedEvent): Promise<void> {
    this.analyzed.push(event);
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

  public publishAllChunksCompleted(event: AllChunksCompletedEvent): Promise<void> {
    this.all.push(event);
    return Promise.resolve();
  }

  public publishVideoCompleted(event: VideoCompletedEvent): Promise<void> {
    this.videoCompleted.push(event);
    return Promise.resolve();
  }
}

describe('AggregateChunksUseCase', () => {
  let videoRepository: InMemoryVideoRepository;
  let chunkRepository: InMemoryChunkRepository;
  let publisher: FakeMessagePublisher;
  let useCase: AggregateChunksUseCase;

  beforeEach(() => {
    videoRepository = new InMemoryVideoRepository();
    chunkRepository = new InMemoryChunkRepository();
    publisher = new FakeMessagePublisher();
    useCase = new AggregateChunksUseCase(
      videoRepository,
      chunkRepository,
      new ChunkCompletionPolicy(),
      publisher,
    );
  });

  async function seedProcessingVideo(): Promise<void> {
    await videoRepository.save(
      Video.reconstitute({
        ...videoBase,
        status: VideoStatus.PROCESSING,
        zipKey: null,
        durationMs: 20_000,
      }),
    );
  }

  it('publishes AllChunksCompleted when the last chunk completes', async () => {
    await seedProcessingVideo();
    await chunkRepository.saveMany([
      Chunk.reconstitute({
        videoId: 'video-1',
        index: 0,
        totalChunks: 2,
        status: ChunkStatus.COMPLETED,
        frameCount: 3,
      }),
      Chunk.reconstitute({
        videoId: 'video-1',
        index: 1,
        totalChunks: 2,
        status: ChunkStatus.COMPLETED,
        frameCount: 4,
      }),
    ]);

    await useCase.execute({ videoId: 'video-1' });

    const video = await videoRepository.findById(VideoId.create('video-1'));
    expect(video?.status).toBe(VideoStatus.AGGREGATING);
    expect(publisher.all).toEqual([{ videoId: 'video-1', totalChunks: 2, totalFrames: 7 }]);
  });

  it('publishes only one event for duplicate aggregation', async () => {
    await seedProcessingVideo();
    await chunkRepository.saveMany([
      Chunk.reconstitute({
        videoId: 'video-1',
        index: 0,
        totalChunks: 1,
        status: ChunkStatus.COMPLETED,
        frameCount: 2,
      }),
    ]);

    await useCase.execute({ videoId: 'video-1' });
    await useCase.execute({ videoId: 'video-1' });

    expect(publisher.all).toHaveLength(1);
  });

  it('does nothing while chunks are missing', async () => {
    await seedProcessingVideo();
    await chunkRepository.saveMany([
      Chunk.reconstitute({
        videoId: 'video-1',
        index: 0,
        totalChunks: 2,
        status: ChunkStatus.COMPLETED,
        frameCount: 2,
      }),
      Chunk.reconstitute({
        videoId: 'video-1',
        index: 1,
        totalChunks: 2,
        status: ChunkStatus.PENDING,
        frameCount: null,
      }),
    ]);

    await useCase.execute({ videoId: 'video-1' });

    const video = await videoRepository.findById(VideoId.create('video-1'));
    expect(video?.status).toBe(VideoStatus.PROCESSING);
    expect(publisher.all).toHaveLength(0);
  });

  it('marks the video as FAILED when any chunk failed', async () => {
    await seedProcessingVideo();
    await chunkRepository.saveMany([
      Chunk.reconstitute({
        videoId: 'video-1',
        index: 0,
        totalChunks: 2,
        status: ChunkStatus.COMPLETED,
        frameCount: 2,
      }),
      Chunk.reconstitute({
        videoId: 'video-1',
        index: 1,
        totalChunks: 2,
        status: ChunkStatus.FAILED,
        frameCount: null,
      }),
    ]);

    await useCase.execute({ videoId: 'video-1' });

    const video = await videoRepository.findById(VideoId.create('video-1'));
    expect(video?.status).toBe(VideoStatus.FAILED);
    expect(publisher.all).toHaveLength(0);
  });

  it('throws when the video does not exist', async () => {
    await expect(useCase.execute({ videoId: 'missing' })).rejects.toThrow(VideoProcessingError);
  });
});
