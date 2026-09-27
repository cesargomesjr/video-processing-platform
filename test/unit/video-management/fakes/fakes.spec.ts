import { Video } from '../../../../src/contexts/video-management/domain/video';
import { VideoFormat } from '../../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../../src/contexts/video-management/domain/video-id';
import { VideoSize } from '../../../../src/contexts/video-management/domain/video-size';
import { FakeMessagePublisher } from './fake-message-publisher';
import { FakeVideoContentInspector } from './fake-video-content-inspector';
import { FakeVideoStorage } from './fake-video-storage';
import { InMemoryVideoRepository } from './in-memory-video-repository';
import { SequentialIdGenerator } from './sequential-id-generator';

describe('video-management fakes', () => {
  const video = Video.create({
    id: VideoId.create('video-1'),
    ownerId: 'user-1',
    originalName: 'movie.mp4',
    format: VideoFormat.create('mp4'),
    size: VideoSize.create(1024, 1024 * 1024),
    storageKey: 'original/user-1/video-1.mp4',
  });

  it('in-memory video repository saves, finds, deletes and paginates', async () => {
    const repository = new InMemoryVideoRepository();

    await repository.save(video);

    await expect(repository.findById(VideoId.create('video-1'))).resolves.toBe(video);
    await expect(repository.findByOwnerId('user-1', 1, 10)).resolves.toEqual({
      items: [video],
      total: 1,
    });

    await repository.delete(VideoId.create('video-1'));
    await expect(repository.findById(VideoId.create('video-1'))).resolves.toBeNull();
  });

  it('fake video storage stores content and can fail', async () => {
    const storage = new FakeVideoStorage();

    await storage.put('key', Buffer.from('content'));
    expect(storage.stored.get('key')).toEqual(Buffer.from('content'));

    storage.shouldFail = true;
    await expect(storage.put('key', Buffer.from('content'))).rejects.toThrow('storage unavailable');
  });

  it('fake message publisher records events and can fail', async () => {
    const publisher = new FakeMessagePublisher();
    const event = {
      videoId: 'video-1',
      ownerId: 'user-1',
      storageKey: 'key',
      format: 'mp4',
      sizeBytes: 1024,
    };

    await publisher.publishVideoUploaded(event);
    expect(publisher.published).toEqual([event]);

    publisher.shouldFail = true;
    await expect(publisher.publishVideoUploaded(event)).rejects.toThrow('publisher unavailable');
  });

  it('fake content inspector returns the configured result', async () => {
    const inspector = new FakeVideoContentInspector();

    await expect(
      inspector.matchesFormat(Buffer.from('content'), VideoFormat.create('mp4')),
    ).resolves.toBe(true);

    inspector.matches = false;
    await expect(
      inspector.matchesFormat(Buffer.from('content'), VideoFormat.create('mp4')),
    ).resolves.toBe(false);
  });

  it('sequential id generator returns deterministic ids', () => {
    const generator = new SequentialIdGenerator();

    expect(generator.next()).toBe('video-1');
    expect(generator.next()).toBe('video-2');
  });
});
