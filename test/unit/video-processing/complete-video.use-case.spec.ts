import { CompleteVideoUseCase } from '../../../src/contexts/video-processing/application/complete-video.use-case';
import { VideoProcessingError } from '../../../src/contexts/video-processing/application/errors';
import { Video } from '../../../src/contexts/video-management/domain/video';
import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoSize } from '../../../src/contexts/video-management/domain/video-size';
import { VideoStatus } from '../../../src/contexts/video-management/domain/video-status';
import { FakeVideoStorage } from '../video-management/fakes/fake-video-storage';
import { InMemoryVideoRepository } from '../video-management/fakes/in-memory-video-repository';

const base = {
  format: VideoFormat.create('mp4'),
  size: VideoSize.create(1024, 1024 * 1024),
};

function pendingVideo(): Video {
  return Video.create({
    id: VideoId.create('video-1'),
    ownerId: 'user-1',
    originalName: 'movie.mp4',
    ...base,
    storageKey: 'original/user-1/video-1.mp4',
  });
}

describe('CompleteVideoUseCase', () => {
  let repository: InMemoryVideoRepository;
  let storage: FakeVideoStorage;
  let useCase: CompleteVideoUseCase;

  beforeEach(() => {
    repository = new InMemoryVideoRepository();
    storage = new FakeVideoStorage();
    useCase = new CompleteVideoUseCase(repository, storage);
  });

  it('completes a pending video with an empty zip archive', async () => {
    await repository.save(pendingVideo());

    await useCase.execute('video-1');

    const saved = await repository.findById(VideoId.create('video-1'));
    expect(saved?.status).toBe(VideoStatus.COMPLETED);
    expect(saved?.zipKey).toBe('archives/video-1.zip');
    expect(storage.stored.has('archives/video-1.zip')).toBe(true);
  });

  it('is idempotent for an already completed video', async () => {
    const completed = Video.reconstitute({
      id: VideoId.create('video-1'),
      ownerId: 'user-1',
      originalName: 'movie.mp4',
      ...base,
      storageKey: 'original/user-1/video-1.mp4',
      status: VideoStatus.COMPLETED,
      zipKey: 'archives/video-1.zip',
    });
    await repository.save(completed);

    await useCase.execute('video-1');

    expect(storage.stored.size).toBe(0);
  });

  it('throws when the video does not exist', async () => {
    await expect(useCase.execute('missing')).rejects.toThrow(VideoProcessingError);
  });

  it('throws when the video is not pending or completed', async () => {
    const processing = Video.reconstitute({
      id: VideoId.create('video-1'),
      ownerId: 'user-1',
      originalName: 'movie.mp4',
      ...base,
      storageKey: 'original/user-1/video-1.mp4',
      status: VideoStatus.PROCESSING,
      zipKey: null,
    });
    await repository.save(processing);

    await expect(useCase.execute('video-1')).rejects.toThrow(VideoProcessingError);
  });
});
