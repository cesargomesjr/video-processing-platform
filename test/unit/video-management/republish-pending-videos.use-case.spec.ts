import { RepublishPendingVideosUseCase } from '../../../src/contexts/video-management/application/republish-pending-videos.use-case';
import { Video } from '../../../src/contexts/video-management/domain/video';
import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoSize } from '../../../src/contexts/video-management/domain/video-size';
import { VideoStatus } from '../../../src/contexts/video-management/domain/video-status';
import { FakeMessagePublisher } from './fakes/fake-message-publisher';
import { InMemoryVideoRepository } from './fakes/in-memory-video-repository';

function pendingVideo(id: string): Video {
  return Video.create({
    id: VideoId.create(id),
    ownerId: 'user-1',
    originalName: `${id}.mp4`,
    format: VideoFormat.create('mp4'),
    size: VideoSize.create(1024, 1024 * 1024),
    storageKey: `original/user-1/${id}.mp4`,
  });
}

describe('RepublishPendingVideosUseCase', () => {
  it('republishes VideoUploaded for stale PENDING videos', async () => {
    const repository = new InMemoryVideoRepository();
    const publisher = new FakeMessagePublisher();
    const useCase = new RepublishPendingVideosUseCase(repository, publisher);

    await repository.save(pendingVideo('video-1'));
    await repository.save(pendingVideo('video-2'));
    await repository.save(
      Video.reconstitute({
        id: VideoId.create('video-3'),
        ownerId: 'user-1',
        originalName: 'video-3.mp4',
        format: VideoFormat.create('mp4'),
        size: VideoSize.create(1024, 1024 * 1024),
        storageKey: 'original/user-1/video-3.mp4',
        status: VideoStatus.ANALYZED,
        zipKey: null,
        durationMs: 10_000,
      }),
    );

    const count = await useCase.execute(new Date());

    expect(count).toBe(2);
    expect(publisher.published.map((event) => event.videoId).sort()).toEqual([
      'video-1',
      'video-2',
    ]);
  });
});
