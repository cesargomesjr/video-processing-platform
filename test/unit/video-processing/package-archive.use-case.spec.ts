import { PackageArchiveUseCase } from '../../../src/contexts/video-processing/application/package-archive.use-case';
import { VideoProcessingError } from '../../../src/contexts/video-processing/application/errors';
import { ArchiveBuilder } from '../../../src/contexts/video-processing/application/ports/archive-builder';
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
import { Video } from '../../../src/contexts/video-management/domain/video';
import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoSize } from '../../../src/contexts/video-management/domain/video-size';
import { VideoStatus } from '../../../src/contexts/video-management/domain/video-status';
import { FakeVideoStorage } from '../video-management/fakes/fake-video-storage';
import { InMemoryVideoRepository } from '../video-management/fakes/in-memory-video-repository';

const videoBase = {
  id: VideoId.create('video-1'),
  ownerId: 'user-1',
  originalName: 'movie.mp4',
  format: VideoFormat.create('mp4'),
  size: VideoSize.create(1024, 1024 * 1024),
  storageKey: 'original/user-1/video-1.mp4',
};

class InMemoryFrameStorage implements FrameStorage {
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

class FakeArchiveBuilder implements ArchiveBuilder {
  public files: Array<{ key: string; content: Buffer }> = [];

  public build(files: ReadonlyArray<{ key: string; content: Buffer }>): Promise<Buffer> {
    this.files = [...files];
    return Promise.resolve(Buffer.from('zip'));
  }
}

class FakeMessagePublisher implements MessagePublisher {
  public readonly analyzed: VideoAnalyzedEvent[] = [];
  public readonly processed: ProcessVideoChunkEvent[] = [];
  public readonly completed: ChunkCompletedEvent[] = [];
  public readonly chunkFailed: ChunkFailedEvent[] = [];
  public readonly all: AllChunksCompletedEvent[] = [];
  public readonly videoCompleted: VideoCompletedEvent[] = [];
  public readonly failed: VideoProcessingFailedEvent[] = [];

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
}

describe('PackageArchiveUseCase', () => {
  let videoRepository: InMemoryVideoRepository;
  let frameStorage: InMemoryFrameStorage;
  let archiveBuilder: FakeArchiveBuilder;
  let videoStorage: FakeVideoStorage;
  let publisher: FakeMessagePublisher;
  let useCase: PackageArchiveUseCase;

  beforeEach(() => {
    videoRepository = new InMemoryVideoRepository();
    frameStorage = new InMemoryFrameStorage();
    archiveBuilder = new FakeArchiveBuilder();
    videoStorage = new FakeVideoStorage();
    publisher = new FakeMessagePublisher();
    useCase = new PackageArchiveUseCase(
      videoRepository,
      frameStorage,
      archiveBuilder,
      videoStorage,
      publisher,
    );
  });

  async function seedAggregatingVideo(): Promise<void> {
    await videoRepository.save(
      Video.reconstitute({
        ...videoBase,
        status: VideoStatus.AGGREGATING,
        zipKey: null,
        durationMs: 10_000,
      }),
    );
  }

  it('packages frames in order and publishes VideoCompleted', async () => {
    await seedAggregatingVideo();
    await frameStorage.put('frames/video-1/frame_000001.png', Buffer.from('b'));
    await frameStorage.put('frames/video-1/frame_000000.png', Buffer.from('a'));

    await useCase.execute({ videoId: 'video-1' });

    expect(archiveBuilder.files.map((file) => file.key)).toEqual([
      'frames/video-1/frame_000000.png',
      'frames/video-1/frame_000001.png',
    ]);

    const video = await videoRepository.findById(VideoId.create('video-1'));
    expect(video?.status).toBe(VideoStatus.COMPLETED);
    expect(video?.zipKey).toBe('archives/video-1.zip');
    expect(videoStorage.stored.get('archives/video-1.zip')).toEqual(Buffer.from('zip'));
    expect(publisher.videoCompleted).toEqual([
      { videoId: 'video-1', ownerId: 'user-1', zipKey: 'archives/video-1.zip', frameCount: 2 },
    ]);
  });

  it('does not set zipKey when the archive upload fails', async () => {
    await seedAggregatingVideo();
    await frameStorage.put('frames/video-1/frame_000000.png', Buffer.from('a'));
    videoStorage.shouldFail = true;

    await useCase.execute({ videoId: 'video-1' });

    const video = await videoRepository.findById(VideoId.create('video-1'));
    expect(video?.status).toBe(VideoStatus.FAILED);
    expect(video?.zipKey).toBeNull();
    expect(publisher.videoCompleted).toHaveLength(0);
    expect(publisher.failed).toMatchObject([
      {
        videoId: 'video-1',
        ownerId: 'user-1',
        reason: 'Archive packaging failed',
      },
    ]);
    expect(publisher.failed[0]?.failedAt).toBeInstanceOf(Date);
  });

  it('does nothing for an already completed video', async () => {
    await videoRepository.save(
      Video.reconstitute({
        ...videoBase,
        status: VideoStatus.COMPLETED,
        zipKey: 'archives/video-1.zip',
        durationMs: 10_000,
      }),
    );

    await useCase.execute({ videoId: 'video-1' });

    expect(archiveBuilder.files).toHaveLength(0);
    expect(publisher.videoCompleted).toHaveLength(0);
  });

  it('throws when the video does not exist', async () => {
    await expect(useCase.execute({ videoId: 'missing' })).rejects.toThrow(VideoProcessingError);
  });
});
