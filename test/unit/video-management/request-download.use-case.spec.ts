import {
  VideoNotCompletedError,
  VideoNotFoundError,
} from '../../../src/contexts/video-management/application/errors';
import { RequestDownloadUseCase } from '../../../src/contexts/video-management/application/request-download.use-case';
import { Video } from '../../../src/contexts/video-management/domain/video';
import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoNotAccessibleError } from '../../../src/contexts/video-management/domain/video-ownership-policy';
import { VideoOwnershipPolicy } from '../../../src/contexts/video-management/domain/video-ownership-policy';
import { VideoSize } from '../../../src/contexts/video-management/domain/video-size';
import { VideoStatus } from '../../../src/contexts/video-management/domain/video-status';
import { FakeSignedUrlGenerator } from './fakes/fake-signed-url-generator';
import { InMemoryVideoRepository } from './fakes/in-memory-video-repository';

const base = {
  format: VideoFormat.create('mp4'),
  size: VideoSize.create(1024, 1024 * 1024),
};

function pendingVideo(ownerId: string, videoId: string): Video {
  return Video.create({
    id: VideoId.create(videoId),
    ownerId,
    originalName: `${videoId}.mp4`,
    ...base,
    storageKey: `original/${ownerId}/${videoId}.mp4`,
  });
}

function completedVideo(ownerId: string, videoId: string): Video {
  return Video.reconstitute({
    id: VideoId.create(videoId),
    ownerId,
    originalName: `${videoId}.mp4`,
    ...base,
    storageKey: `original/${ownerId}/${videoId}.mp4`,
    status: VideoStatus.COMPLETED,
    zipKey: `archive/${videoId}.zip`,
  });
}

describe('RequestDownloadUseCase', () => {
  const expiresInSeconds = 60;

  let repository: InMemoryVideoRepository;
  let signedUrlGenerator: FakeSignedUrlGenerator;
  let useCase: RequestDownloadUseCase;

  beforeEach(() => {
    repository = new InMemoryVideoRepository();
    signedUrlGenerator = new FakeSignedUrlGenerator();
    useCase = new RequestDownloadUseCase(
      repository,
      new VideoOwnershipPolicy(),
      signedUrlGenerator,
      expiresInSeconds,
    );
  });

  it('generates a signed url for a completed video owned by the user', async () => {
    await repository.save(completedVideo('user-1', 'video-1'));

    await expect(useCase.execute({ videoId: 'video-1', userId: 'user-1' })).resolves.toEqual({
      url: 'https://storage.example/signed',
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(signedUrlGenerator.generated).toEqual([
      { key: 'archive/video-1.zip', expiresInSeconds: 60 },
    ]);
  });

  it('throws when the video does not exist', async () => {
    await expect(useCase.execute({ videoId: 'missing', userId: 'user-1' })).rejects.toThrow(
      VideoNotFoundError,
    );
  });

  it('throws when the requesting user is not the owner', async () => {
    await repository.save(completedVideo('user-1', 'video-1'));

    await expect(useCase.execute({ videoId: 'video-1', userId: 'user-2' })).rejects.toThrow(
      VideoNotAccessibleError,
    );
  });

  it('throws when the video is not completed', async () => {
    await repository.save(pendingVideo('user-1', 'video-1'));

    await expect(useCase.execute({ videoId: 'video-1', userId: 'user-1' })).rejects.toThrow(
      VideoNotCompletedError,
    );
  });
});
