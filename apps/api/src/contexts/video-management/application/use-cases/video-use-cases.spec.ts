import {
  VideoNotFoundError,
  VideoUploadInvalidStateError,
} from '../errors/video-errors.js';
import {
  IdentifierGenerator,
  VideoConfirmationUnitOfWork,
  VideoRepository,
  VideoStorage,
  type SignedUpload,
  type VideoPage,
  type VideoUploadedEvent,
} from '../ports/video-ports.js';
import { ConfirmVideoUpload } from './confirm-video-upload.js';
import { CreateVideoUpload } from './create-video-upload.js';
import { GetUserVideo, ListUserVideos } from './query-videos.js';
import { Video } from '../../domain/video.js';
import { VideoId, VideoOwnerId } from '../../domain/video-id.js';

const VIDEO_ID = '10000000-0000-4000-8000-000000000001';
const EVENT_ID = '20000000-0000-4000-8000-000000000002';
const OWNER_ID = '30000000-0000-4000-8000-000000000003';
const NOW = new Date('2026-09-26T12:00:00.000Z');

class RepositoryFake extends VideoRepository {
  public created: Video[] = [];
  public found: Video | null = null;
  public page: VideoPage = { items: [], nextCursor: null };
  public createError: Error | null = null;
  public findCalls = 0;

  public create(video: Video): Promise<void> {
    if (this.createError !== null) return Promise.reject(this.createError);
    this.created.push(video);
    return Promise.resolve();
  }

  public findOwnedById(): Promise<Video | null> {
    this.findCalls += 1;
    return Promise.resolve(this.found);
  }

  public listOwned(): Promise<VideoPage> {
    return Promise.resolve(this.page);
  }
}

class StorageFake extends VideoStorage {
  public createCalls: {
    key: string;
    contentType: string;
    expiresAt: Date;
  }[] = [];
  public statCalls = 0;
  public createError: Error | null = null;

  public createUpload(
    key: string,
    contentType: string,
    expiresAt: Date,
  ): Promise<SignedUpload> {
    if (this.createError !== null) return Promise.reject(this.createError);
    this.createCalls.push({ key, contentType, expiresAt });
    return Promise.resolve({
      method: 'PUT',
      url: 'http://storage/upload',
      headers: { 'content-type': contentType },
      expiresAt,
    });
  }

  public statObject(): Promise<{
    version: string;
    etag: string;
    contentType: string;
    sizeBytes: number;
  }> {
    this.statCalls += 1;
    return Promise.resolve({
      version: 'version-1',
      etag: 'etag-1',
      contentType: 'video/mp4',
      sizeBytes: 12,
    });
  }
}

class IdsFake extends IdentifierGenerator {
  public constructor(private readonly values: string[]) {
    super();
  }

  public generate(): string {
    const value = this.values.shift();
    if (value === undefined) throw new Error('No fake identifier available');
    return value;
  }
}

class ConfirmationFake extends VideoConfirmationUnitOfWork {
  public result = true;
  public events: VideoUploadedEvent[] = [];
  public onConfirm: (() => void) | null = null;

  public confirm(_video: Video, event: VideoUploadedEvent): Promise<boolean> {
    this.events.push(event);
    this.onConfirm?.();
    return Promise.resolve(this.result);
  }
}

function awaitingVideo(): Video {
  return Video.create({
    id: VideoId.create(VIDEO_ID),
    ownerId: VideoOwnerId.create(OWNER_ID),
    originalFilename: 'sample.mp4',
    declaredContentType: 'video/mp4',
    declaredSizeBytes: 12,
    storageKey: `videos/${VIDEO_ID}/original.mp4`,
    uploadExpiresAt: new Date(NOW.getTime() + 900_000),
    now: NOW,
  });
}

function pendingVideo(): Video {
  const video = awaitingVideo();
  video.confirm(
    {
      version: 'version-1',
      etag: 'etag-1',
      contentType: 'video/mp4',
      sizeBytes: 12,
    },
    NOW,
  );
  return video;
}

describe('Video management use cases', () => {
  it('creates a deterministic signed upload before persisting the video', async () => {
    const repository = new RepositoryFake();
    const storage = new StorageFake();
    const useCase = new CreateVideoUpload(
      repository,
      storage,
      new IdsFake([VIDEO_ID]),
      100,
      900,
      () => NOW,
    );

    const result = await useCase.execute({
      ownerId: VideoOwnerId.create(OWNER_ID),
      filename: 'sample.mp4',
      contentType: 'video/mp4',
      sizeBytes: 12,
    });

    expect(result.video.snapshot).toMatchObject({
      status: 'AWAITING_UPLOAD',
      storageKey: `videos/${VIDEO_ID}/original.mp4`,
      uploadExpiresAt: new Date('2026-09-26T12:15:00.000Z'),
    });
    expect(storage.createCalls).toEqual([
      {
        key: `videos/${VIDEO_ID}/original.mp4`,
        contentType: 'video/mp4',
        expiresAt: new Date('2026-09-26T12:15:00.000Z'),
      },
    ]);
    expect(repository.created).toEqual([result.video]);
  });

  it('does not persist when storage cannot sign the upload', async () => {
    const repository = new RepositoryFake();
    const storage = new StorageFake();
    storage.createError = new Error('storage unavailable');
    const useCase = new CreateVideoUpload(
      repository,
      storage,
      new IdsFake([VIDEO_ID]),
      100,
      900,
      () => NOW,
    );

    await expect(
      useCase.execute({
        ownerId: VideoOwnerId.create(OWNER_ID),
        filename: 'sample.mp4',
        contentType: 'video/mp4',
        sizeBytes: 12,
      }),
    ).rejects.toThrow('storage unavailable');
    expect(repository.created).toEqual([]);
  });

  it('confirms storage metadata and emits VideoUploaded once', async () => {
    const repository = new RepositoryFake();
    repository.found = awaitingVideo();
    const storage = new StorageFake();
    const confirmation = new ConfirmationFake();
    const useCase = new ConfirmVideoUpload(
      repository,
      storage,
      confirmation,
      new IdsFake([EVENT_ID]),
      () => NOW,
    );

    const result = await useCase.execute({
      ownerId: VideoOwnerId.create(OWNER_ID),
      videoId: VideoId.create(VIDEO_ID),
      correlationId: '40000000-0000-4000-8000-000000000004',
    });

    expect(result.snapshot.status).toBe('PENDING');
    expect(confirmation.events).toHaveLength(1);
    expect(confirmation.events[0]).toMatchObject({
      eventId: EVENT_ID,
      eventType: 'VideoUploaded',
      eventVersion: 1,
      payload: { videoId: VIDEO_ID },
    });
  });

  it('returns an already confirmed video without touching storage', async () => {
    const repository = new RepositoryFake();
    repository.found = pendingVideo();
    const storage = new StorageFake();
    const useCase = new ConfirmVideoUpload(
      repository,
      storage,
      new ConfirmationFake(),
      new IdsFake([]),
      () => NOW,
    );

    const result = await useCase.execute({
      ownerId: VideoOwnerId.create(OWNER_ID),
      videoId: VideoId.create(VIDEO_ID),
      correlationId: '40000000-0000-4000-8000-000000000004',
    });

    expect(result.snapshot.status).toBe('PENDING');
    expect(storage.statCalls).toBe(0);
  });

  it('reloads the winner of a concurrent confirmation', async () => {
    const repository = new RepositoryFake();
    repository.found = awaitingVideo();
    const storage = new StorageFake();
    const confirmation = new ConfirmationFake();
    confirmation.result = false;
    const useCase = new ConfirmVideoUpload(
      repository,
      storage,
      confirmation,
      new IdsFake([EVENT_ID]),
      () => {
        repository.found = pendingVideo();
        return NOW;
      },
    );

    const result = await useCase.execute({
      ownerId: VideoOwnerId.create(OWNER_ID),
      videoId: VideoId.create(VIDEO_ID),
      correlationId: '40000000-0000-4000-8000-000000000004',
    });

    expect(result.snapshot.status).toBe('PENDING');
    expect(repository.findCalls).toBe(2);
  });

  it('rejects an unresolved concurrent confirmation as an invalid state', async () => {
    const repository = new RepositoryFake();
    repository.found = awaitingVideo();
    const confirmation = new ConfirmationFake();
    confirmation.result = false;
    confirmation.onConfirm = () => {
      repository.found = awaitingVideo();
    };
    const useCase = new ConfirmVideoUpload(
      repository,
      new StorageFake(),
      confirmation,
      new IdsFake([EVENT_ID]),
      () => NOW,
    );

    await expect(
      useCase.execute({
        ownerId: VideoOwnerId.create(OWNER_ID),
        videoId: VideoId.create(VIDEO_ID),
        correlationId: '40000000-0000-4000-8000-000000000004',
      }),
    ).rejects.toBeInstanceOf(VideoUploadInvalidStateError);
  });

  it('does not reveal a missing or losing foreign resource', async () => {
    const repository = new RepositoryFake();
    const useCase = new ConfirmVideoUpload(
      repository,
      new StorageFake(),
      new ConfirmationFake(),
      new IdsFake([]),
      () => NOW,
    );

    await expect(
      useCase.execute({
        ownerId: VideoOwnerId.create(OWNER_ID),
        videoId: VideoId.create(VIDEO_ID),
        correlationId: '40000000-0000-4000-8000-000000000004',
      }),
    ).rejects.toBeInstanceOf(VideoNotFoundError);
  });

  it('delegates listing and rejects a missing detail', async () => {
    const repository = new RepositoryFake();
    const list = new ListUserVideos(repository);
    const get = new GetUserVideo(repository);
    const ownerId = VideoOwnerId.create(OWNER_ID);
    const videoId = VideoId.create(VIDEO_ID);

    await expect(
      list.execute({ ownerId, limit: 20, cursor: null }),
    ).resolves.toEqual({ items: [], nextCursor: null });
    await expect(get.execute(ownerId, videoId)).rejects.toBeInstanceOf(
      VideoNotFoundError,
    );

    repository.found = awaitingVideo();
    await expect(get.execute(ownerId, videoId)).resolves.toBe(repository.found);
  });
});
