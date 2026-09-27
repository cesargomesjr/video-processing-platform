import { InvalidPaginationError } from '../../../src/contexts/video-management/application/errors';
import { ListUserVideosUseCase } from '../../../src/contexts/video-management/application/list-user-videos.use-case';
import { Video } from '../../../src/contexts/video-management/domain/video';
import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoSize } from '../../../src/contexts/video-management/domain/video-size';
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

describe('ListUserVideosUseCase', () => {
  let repository: InMemoryVideoRepository;
  let useCase: ListUserVideosUseCase;

  beforeEach(() => {
    repository = new InMemoryVideoRepository();
    useCase = new ListUserVideosUseCase(repository);
  });

  it('returns only the owner videos', async () => {
    await repository.save(videoFor('user-1', 'video-1'));
    await repository.save(videoFor('user-1', 'video-2'));
    await repository.save(videoFor('user-2', 'video-3'));

    const result = await useCase.execute({ ownerId: 'user-1', page: 1, pageSize: 10 });

    expect(result.total).toBe(2);
    expect(result.items.map((video) => video.id.value)).toEqual(['video-1', 'video-2']);
  });

  it('paginates results', async () => {
    await repository.save(videoFor('user-1', 'video-1'));
    await repository.save(videoFor('user-1', 'video-2'));
    await repository.save(videoFor('user-1', 'video-3'));

    const page1 = await useCase.execute({ ownerId: 'user-1', page: 1, pageSize: 2 });
    const page2 = await useCase.execute({ ownerId: 'user-1', page: 2, pageSize: 2 });

    expect(page1.items.map((video) => video.id.value)).toEqual(['video-1', 'video-2']);
    expect(page2.items.map((video) => video.id.value)).toEqual(['video-3']);
  });

  it('applies default page and page size', async () => {
    await repository.save(videoFor('user-1', 'video-1'));

    const result = await useCase.execute({ ownerId: 'user-1' });

    expect(result.items).toHaveLength(1);
  });

  it('rejects invalid pagination', async () => {
    await expect(useCase.execute({ ownerId: 'user-1', page: 0, pageSize: 10 })).rejects.toThrow(
      InvalidPaginationError,
    );
    await expect(useCase.execute({ ownerId: 'user-1', page: 1, pageSize: 0 })).rejects.toThrow(
      InvalidPaginationError,
    );
    await expect(useCase.execute({ ownerId: 'user-1', page: 1, pageSize: 101 })).rejects.toThrow(
      InvalidPaginationError,
    );
  });
});
