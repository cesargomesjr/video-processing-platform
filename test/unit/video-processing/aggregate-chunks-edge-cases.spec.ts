import { AggregateChunksUseCase } from '../../../src/contexts/video-processing/application/aggregate-chunks.use-case';
import { VideoProcessingError } from '../../../src/contexts/video-processing/application/errors';
import { ChunkRepository } from '../../../src/contexts/video-processing/application/ports/chunk-repository';
import { MessagePublisher } from '../../../src/contexts/video-processing/application/ports/message-publisher';
import { ProcessingVideoRepository } from '../../../src/contexts/video-processing/application/ports/processing-video-repository';
import { Chunk } from '../../../src/contexts/video-processing/domain/chunk';
import { ChunkCompletionPolicy } from '../../../src/contexts/video-processing/domain/chunk-completion-policy';
import { ChunkStatus } from '../../../src/contexts/video-processing/domain/chunk-status';

describe('AggregateChunksUseCase edge cases', () => {
  const video = {
    id: 'video-1',
    ownerId: 'user-1',
    storageKey: 'movie.mp4',
    status: 'PROCESSING',
    durationMs: 1000,
    zipKey: null,
  };
  const videos = {
    findById: jest.fn(),
    markFailed: jest.fn(),
    markAggregating: jest.fn(),
  };
  const chunks = { findByVideoId: jest.fn() };
  const publisher = {
    publishVideoProcessingFailed: jest.fn(),
    publishAllChunksCompleted: jest.fn(),
  };
  const useCase = new AggregateChunksUseCase(
    videos as unknown as ProcessingVideoRepository,
    chunks as unknown as ChunkRepository,
    new ChunkCompletionPolicy(),
    publisher as unknown as MessagePublisher,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    videos.findById.mockResolvedValue(video);
    videos.markFailed.mockResolvedValue(true);
    videos.markAggregating.mockResolvedValue(true);
    chunks.findByVideoId.mockResolvedValue([]);
  });

  it('rejects an unknown video before fetching its chunks', async () => {
    videos.findById.mockResolvedValue(null);

    await expect(useCase.execute({ videoId: 'missing' })).rejects.toThrow(VideoProcessingError);
    expect(chunks.findByVideoId).not.toHaveBeenCalled();
  });

  it('does nothing when a processing video has no chunks', async () => {
    await useCase.execute({ videoId: 'video-1' });

    expect(videos.markAggregating).not.toHaveBeenCalled();
    expect(publisher.publishAllChunksCompleted).not.toHaveBeenCalled();
  });

  it('does not publish a failure when another worker already changed the video', async () => {
    chunks.findByVideoId.mockResolvedValue([
      Chunk.reconstitute({
        videoId: 'video-1',
        index: 0,
        status: ChunkStatus.FAILED,
        frameCount: null,
      }),
    ]);
    videos.markFailed.mockResolvedValue(false);

    await useCase.execute({ videoId: 'video-1' });

    expect(videos.markFailed).toHaveBeenCalledWith('video-1', 'PROCESSING');
    expect(publisher.publishVideoProcessingFailed).not.toHaveBeenCalled();
  });

  it('does not publish completion when another worker already began aggregation', async () => {
    chunks.findByVideoId.mockResolvedValue([
      Chunk.reconstitute({
        videoId: 'video-1',
        index: 0,
        status: ChunkStatus.COMPLETED,
        frameCount: 2,
      }),
    ]);
    videos.markAggregating.mockResolvedValue(false);

    await useCase.execute({ videoId: 'video-1' });

    expect(videos.markAggregating).toHaveBeenCalledWith('video-1');
    expect(publisher.publishAllChunksCompleted).not.toHaveBeenCalled();
  });

  it('counts a completed chunk with no recorded frames as zero', async () => {
    chunks.findByVideoId.mockResolvedValue([
      Chunk.reconstitute({
        videoId: 'video-1',
        index: 0,
        status: ChunkStatus.COMPLETED,
        frameCount: null,
      }),
    ]);

    await useCase.execute({ videoId: 'video-1' });

    expect(publisher.publishAllChunksCompleted).toHaveBeenCalledWith({
      videoId: 'video-1',
      totalChunks: 1,
      totalFrames: 0,
    });
  });
});
