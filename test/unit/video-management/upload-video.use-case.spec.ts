import {
  VideoContentMismatchError,
  VideoStorageWriteError,
  VideoTooLargeError,
} from '../../../src/contexts/video-management/application/errors';
import { UploadVideoUseCase } from '../../../src/contexts/video-management/application/upload-video.use-case';
import { UnsupportedVideoFormatError } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoStatus } from '../../../src/contexts/video-management/domain/video-status';
import { FakeMessagePublisher } from './fakes/fake-message-publisher';
import { FakeVideoContentInspector } from './fakes/fake-video-content-inspector';
import { FakeVideoStorage } from './fakes/fake-video-storage';
import { InMemoryVideoRepository } from './fakes/in-memory-video-repository';
import { SequentialIdGenerator } from './fakes/sequential-id-generator';

describe('UploadVideoUseCase', () => {
  const MAX_BYTES = 1024 * 1024;
  const content = Buffer.from('video-bytes');

  let repository: InMemoryVideoRepository;
  let storage: FakeVideoStorage;
  let publisher: FakeMessagePublisher;
  let inspector: FakeVideoContentInspector;
  let useCase: UploadVideoUseCase;

  beforeEach(() => {
    repository = new InMemoryVideoRepository();
    storage = new FakeVideoStorage();
    publisher = new FakeMessagePublisher();
    inspector = new FakeVideoContentInspector();
    useCase = new UploadVideoUseCase(
      repository,
      storage,
      publisher,
      inspector,
      new SequentialIdGenerator(),
      MAX_BYTES,
    );
  });

  it('uploads a valid video, persists it as PENDING and publishes the event', async () => {
    const result = await useCase.execute({
      ownerId: 'user-1',
      originalName: 'movie.mp4',
      content,
    });

    expect(result).toEqual({ videoId: 'video-1', status: 'PENDING' });

    const saved = await repository.findById(VideoId.create('video-1'));
    expect(saved).not.toBeNull();
    expect(saved?.ownerId).toBe('user-1');
    expect(saved?.format.value).toBe('mp4');
    expect(saved?.size.bytes).toBe(content.length);
    expect(saved?.status).toBe(VideoStatus.PENDING);
    expect(storage.stored.get('original/user-1/video-1.mp4')).toEqual(content);
    expect(publisher.published).toEqual([
      {
        videoId: 'video-1',
        ownerId: 'user-1',
        storageKey: 'original/user-1/video-1.mp4',
        format: 'mp4',
        sizeBytes: content.length,
      },
    ]);
  });

  it('derives ownerId from the token input, never from the body', async () => {
    await useCase.execute({
      ownerId: 'token-user',
      originalName: 'movie.mp4',
      content,
    });

    const saved = await repository.findById(VideoId.create('video-1'));
    expect(saved?.ownerId).toBe('token-user');
    expect(publisher.published[0]?.ownerId).toBe('token-user');
  });

  it('rejects an unsupported extension', async () => {
    await expect(
      useCase.execute({ ownerId: 'user-1', originalName: 'movie.exe', content }),
    ).rejects.toThrow(UnsupportedVideoFormatError);
  });

  it('accepts content exactly at the maximum size', async () => {
    const atLimit = Buffer.alloc(MAX_BYTES, 0);

    await expect(
      useCase.execute({ ownerId: 'user-1', originalName: 'movie.mp4', content: atLimit }),
    ).resolves.toEqual({ videoId: 'video-1', status: 'PENDING' });
  });

  it('rejects content above the maximum size', async () => {
    const tooLarge = Buffer.alloc(MAX_BYTES + 1, 0);

    await expect(
      useCase.execute({ ownerId: 'user-1', originalName: 'movie.mp4', content: tooLarge }),
    ).rejects.toThrow(VideoTooLargeError);
  });

  it('rejects content whose real type does not match the extension', async () => {
    inspector.matches = false;

    await expect(
      useCase.execute({ ownerId: 'user-1', originalName: 'movie.mp4', content }),
    ).rejects.toThrow(VideoContentMismatchError);
  });

  it('removes the persisted video when storage write fails', async () => {
    storage.shouldFail = true;

    await expect(
      useCase.execute({ ownerId: 'user-1', originalName: 'movie.mp4', content }),
    ).rejects.toThrow(VideoStorageWriteError);
    await expect(repository.findById(VideoId.create('video-1'))).resolves.toBeNull();
  });

  it('keeps the video PENDING when publishing fails', async () => {
    publisher.shouldFail = true;

    const result = await useCase.execute({
      ownerId: 'user-1',
      originalName: 'movie.mp4',
      content,
    });

    expect(result).toEqual({ videoId: 'video-1', status: 'PENDING' });
    await expect(repository.findById(VideoId.create('video-1'))).resolves.not.toBeNull();
  });
});
