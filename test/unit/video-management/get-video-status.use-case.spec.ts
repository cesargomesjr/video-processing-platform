import { VideoNotFoundError } from '../../../src/contexts/video-management/application/errors';
import { GetVideoStatusUseCase } from '../../../src/contexts/video-management/application/get-video-status.use-case';
import { Video } from '../../../src/contexts/video-management/domain/video';
import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoNotAccessibleError } from '../../../src/contexts/video-management/domain/video-ownership-policy';
import { VideoSize } from '../../../src/contexts/video-management/domain/video-size';
import { VideoOwnershipPolicy } from '../../../src/contexts/video-management/domain/video-ownership-policy';
import { InMemoryVideoRepository } from './fakes/in-memory-video-repository';

function videoFor(ownerId: string, videoId: string): Video {
  return Video.create({
    id: VideoId.create(videoId),
    ownerId,
    originalName: `${videoId}.mp4`,
    format: VideoFormat.create('mp4'),
    size: VideoSize.create(1024, 1024 * 1024),
    storageKey: `original/${ownerId}/${videoId}.mp4`,
  });
}

describe('GetVideoStatusUseCase', () => {
  let repository: InMemoryVideoRepository;
  let useCase: GetVideoStatusUseCase;

  beforeEach(() => {
    repository = new InMemoryVideoRepository();
    useCase = new GetVideoStatusUseCase(repository, new VideoOwnershipPolicy());
  });

  it('returns the status for the owner', async () => {
    await repository.save(videoFor('user-1', 'video-1'));

    await expect(useCase.execute({ videoId: 'video-1', userId: 'user-1' })).resolves.toEqual({
      videoId: 'video-1',
      status: 'PENDING',
      originalName: 'video-1.mp4',
      format: 'mp4',
      sizeBytes: 1024,
      durationMs: null,
      progress: 10,
    });
  });

  it('throws when the video does not exist', async () => {
    await expect(useCase.execute({ videoId: 'missing', userId: 'user-1' })).rejects.toThrow(
      VideoNotFoundError,
    );
  });

  it('throws when the requesting user is not the owner', async () => {
    await repository.save(videoFor('user-1', 'video-1'));

    await expect(useCase.execute({ videoId: 'video-1', userId: 'user-2' })).rejects.toThrow(
      VideoNotAccessibleError,
    );
  });
});
