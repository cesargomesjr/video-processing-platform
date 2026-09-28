import { ProcessChunkUseCase } from '../../../src/contexts/video-processing/application/process-chunk.use-case';
import { VideoProcessingError } from '../../../src/contexts/video-processing/application/errors';
import { ChunkRepository } from '../../../src/contexts/video-processing/application/ports/chunk-repository';
import {
  ExtractedFrame,
  FrameExtractor,
} from '../../../src/contexts/video-processing/application/ports/frame-extractor';
import { FrameStorage } from '../../../src/contexts/video-processing/application/ports/frame-storage';
import {
  AllChunksCompletedEvent,
  ChunkCompletedEvent,
  ChunkFailedEvent,
  MessagePublisher,
  ProcessVideoChunkEvent,
  VideoAnalyzedEvent,
  VideoCompletedEvent,
  VideoProcessingFailedEvent,
} from '../../../src/contexts/video-processing/application/ports/message-publisher';
import { Chunk } from '../../../src/contexts/video-processing/domain/chunk';
import { ChunkStatus } from '../../../src/contexts/video-processing/domain/chunk-status';
import { FakeVideoStorage } from '../video-management/fakes/fake-video-storage';

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

class FakeFrameExtractor implements FrameExtractor {
  public shouldThrow = false;
  public calls = 0;
  public lastStorageKey: string | null = null;
  public frames: ExtractedFrame[] = [
    { key: 'frame_000000.png', content: Buffer.from('a') },
    { key: 'frame_000001.png', content: Buffer.from('b') },
  ];

  public extract(input: Parameters<FrameExtractor['extract']>[0]): Promise<ExtractedFrame[]> {
    this.calls += 1;
    this.lastStorageKey = input.storageKey;

    if (this.shouldThrow) {
      return Promise.reject(new Error('ffmpeg failed'));
    }

    return Promise.resolve(this.frames);
  }
}

class FakeFrameStorage implements FrameStorage {
  public readonly stored = new Map<string, Buffer>();

  public put(key: string, content: Buffer): Promise<void> {
    this.stored.set(key, content);
    return Promise.resolve();
  }

  public get(key: string): Promise<Buffer> {
    return Promise.resolve(this.stored.get(key) ?? Buffer.alloc(0));
  }

  public list(prefix: string): Promise<string[]> {
    return Promise.resolve([...this.stored.keys()].filter((key) => key.startsWith(prefix)).sort());
  }
}

class FakeMessagePublisher implements MessagePublisher {
  public readonly completed: ChunkCompletedEvent[] = [];
  public readonly chunkFailed: ChunkFailedEvent[] = [];
  public readonly all: AllChunksCompletedEvent[] = [];
  public readonly videoCompleted: VideoCompletedEvent[] = [];
  public readonly failed: VideoProcessingFailedEvent[] = [];
  public readonly processed: ProcessVideoChunkEvent[] = [];
  public readonly analyzed: VideoAnalyzedEvent[] = [];

  public publishChunkCompleted(event: ChunkCompletedEvent): Promise<void> {
    this.completed.push(event);
    return Promise.resolve();
  }

  public publishChunkFailed(event: ChunkFailedEvent): Promise<void> {
    this.chunkFailed.push(event);
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

  public publishVideoProcessingFailed(event: VideoProcessingFailedEvent): Promise<void> {
    this.failed.push(event);
    return Promise.resolve();
  }

  public publishProcessVideoChunk(event: ProcessVideoChunkEvent): Promise<void> {
    this.processed.push(event);
    return Promise.resolve();
  }

  public publishVideoAnalyzed(event: VideoAnalyzedEvent): Promise<void> {
    this.analyzed.push(event);
    return Promise.resolve();
  }
}

describe('ProcessChunkUseCase', () => {
  const input = {
    videoId: 'video-1',
    chunkIndex: 0,
    startSeconds: 0,
    durationSeconds: 10,
    storageKey: 'original/user-1/video-1.mp4',
  };

  let repository: InMemoryChunkRepository;
  let extractor: FakeFrameExtractor;
  let storage: FakeFrameStorage;
  let publisher: FakeMessagePublisher;
  let useCase: ProcessChunkUseCase;

  beforeEach(() => {
    repository = new InMemoryChunkRepository();
    extractor = new FakeFrameExtractor();
    storage = new FakeFrameStorage();
    publisher = new FakeMessagePublisher();
    useCase = new ProcessChunkUseCase(
      repository,
      new FakeVideoStorage(),
      extractor,
      storage,
      publisher,
    );
  });

  it('processes a pending chunk and publishes the frame count', async () => {
    await repository.saveMany([Chunk.create({ videoId: 'video-1', index: 0, totalChunks: 2 })]);

    await useCase.execute(input);

    const chunk = await repository.findByVideoAndIndex('video-1', 0);
    expect(chunk?.status).toBe(ChunkStatus.COMPLETED);
    expect(chunk?.frameCount).toBe(2);
    expect(storage.stored.size).toBe(2);
    expect(publisher.completed).toEqual([{ videoId: 'video-1', chunkIndex: 0, frameCount: 2 }]);
  });

  it('does nothing for a duplicate completed chunk', async () => {
    await repository.saveMany([
      Chunk.reconstitute({
        videoId: 'video-1',
        index: 0,
        totalChunks: 2,
        status: ChunkStatus.COMPLETED,
        frameCount: 2,
      }),
    ]);

    await useCase.execute(input);

    expect(extractor.calls).toBe(0);
    expect(publisher.completed).toHaveLength(0);
  });

  it('does nothing when the claim is lost', async () => {
    await repository.saveMany([
      Chunk.reconstitute({
        videoId: 'video-1',
        index: 0,
        totalChunks: 2,
        status: ChunkStatus.PROCESSING,
        frameCount: null,
      }),
    ]);

    await useCase.execute(input);

    expect(extractor.calls).toBe(0);
  });

  it('marks the chunk as FAILED when extraction fails', async () => {
    await repository.saveMany([Chunk.create({ videoId: 'video-1', index: 0, totalChunks: 2 })]);
    extractor.shouldThrow = true;

    await useCase.execute(input);

    const chunk = await repository.findByVideoAndIndex('video-1', 0);
    expect(chunk?.status).toBe(ChunkStatus.FAILED);
    expect(publisher.completed).toHaveLength(0);
    expect(publisher.chunkFailed).toEqual([{ videoId: 'video-1', chunkIndex: 0 }]);
  });

  it('throws when the chunk does not exist', async () => {
    await expect(useCase.execute(input)).rejects.toThrow(VideoProcessingError);
  });
});
