import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  IdentityTokenVerifier,
  type VerifiedIdentity,
} from '../src/contexts/identity/application/ports/identity-token-verifier.js';
import { UserRepository } from '../src/contexts/identity/application/ports/user-repository.js';
import type { User } from '../src/contexts/identity/domain/user.js';
import { VideoUploadNotFoundError } from '../src/contexts/video-management/application/errors/video-errors.js';
import {
  IdentifierGenerator,
  VideoConfirmationUnitOfWork,
  VideoRepository,
  VideoStorage,
  type SignedUpload,
  type VideoCursor,
  type VideoPage,
  type VideoUploadedEvent,
} from '../src/contexts/video-management/application/ports/video-ports.js';
import type {
  Video,
  VerifiedVideoObject,
} from '../src/contexts/video-management/domain/video.js';
import type {
  VideoId,
  VideoOwnerId,
} from '../src/contexts/video-management/domain/video-id.js';
import { AppModule } from '../src/main/app.module.js';

class TokenVerifier extends IdentityTokenVerifier {
  public verify(token: string): Promise<VerifiedIdentity> {
    if (!token.startsWith('user-'))
      return Promise.reject(new Error('bad token'));
    return Promise.resolve({
      subject: token,
      email: `${token}@example.com`,
      emailVerified: true,
    });
  }
}
class Users extends UserRepository {
  private readonly users = new Map<string, User>();
  public upsertByFirebaseUid(candidate: User): Promise<User> {
    const key = candidate.firebaseUid.toString();
    const user = this.users.get(key) ?? candidate;
    this.users.set(key, user);
    return Promise.resolve(user);
  }
}
class Videos extends VideoRepository {
  public readonly values = new Map<string, Video>();
  public create(video: Video): Promise<void> {
    this.values.set(video.snapshot.id.toString(), video);
    return Promise.resolve();
  }
  public findOwnedById(
    ownerId: VideoOwnerId,
    videoId: VideoId,
  ): Promise<Video | null> {
    const video = this.values.get(videoId.toString());
    return Promise.resolve(
      video?.snapshot.ownerId.toString() === ownerId.toString() ? video : null,
    );
  }
  public listOwned(
    ownerId: VideoOwnerId,
    limit: number,
    cursor: VideoCursor | null,
  ): Promise<VideoPage> {
    const sorted = [...this.values.values()]
      .filter(
        (video) => video.snapshot.ownerId.toString() === ownerId.toString(),
      )
      .sort((left, right) =>
        right.snapshot.id.toString().localeCompare(left.snapshot.id.toString()),
      );
    const start =
      cursor === null
        ? 0
        : sorted.findIndex(
            (video) => video.snapshot.id.toString() === cursor.id.toString(),
          ) + 1;
    const items = sorted.slice(start, start + limit);
    const hasMore = sorted.length > start + limit;
    const last = items.at(-1);
    return Promise.resolve({
      items,
      nextCursor:
        hasMore && last !== undefined
          ? { createdAt: last.snapshot.createdAt, id: last.snapshot.id }
          : null,
    });
  }
}
class Storage extends VideoStorage {
  public missing = false;
  private readonly metadata = new Map<
    string,
    { contentType: string; sizeBytes: number }
  >();
  public createUpload(
    key: string,
    contentType: string,
    expiresAt: Date,
  ): Promise<SignedUpload> {
    this.metadata.set(key, { contentType, sizeBytes: 100 });
    return Promise.resolve({
      method: 'PUT',
      url: `http://storage/${key}`,
      headers: { 'content-type': contentType },
      expiresAt,
    });
  }
  public statObject(key: string): Promise<VerifiedVideoObject> {
    const metadata = this.metadata.get(key);
    if (this.missing || metadata === undefined)
      return Promise.reject(new VideoUploadNotFoundError());
    return Promise.resolve({ version: 'v1', etag: 'etag', ...metadata });
  }
}
class Confirmations extends VideoConfirmationUnitOfWork {
  public readonly events: VideoUploadedEvent[] = [];
  public confirm(_video: Video, event: VideoUploadedEvent): Promise<boolean> {
    this.events.push(event);
    return Promise.resolve(true);
  }
}
class Ids extends IdentifierGenerator {
  public generate(): string {
    return randomUUID();
  }
}

describe('Video Management (e2e)', () => {
  let app: INestApplication;
  let storage: Storage;
  let confirmations: Confirmations;

  beforeEach(async () => {
    storage = new Storage();
    confirmations = new Confirmations();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(IdentityTokenVerifier)
      .useValue(new TokenVerifier())
      .overrideProvider(UserRepository)
      .useValue(new Users())
      .overrideProvider(VideoRepository)
      .useValue(new Videos())
      .overrideProvider(VideoStorage)
      .useValue(storage)
      .overrideProvider(VideoConfirmationUnitOfWork)
      .useValue(confirmations)
      .overrideProvider(IdentifierGenerator)
      .useValue(new Ids())
      .compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
  });
  afterEach(async () => {
    await app.close();
  });

  async function create(token = 'user-a'): Promise<string> {
    const result = await request(await app.getUrl())
      .post('/videos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        filename: 'sample.mp4',
        contentType: 'video/mp4',
        sizeBytes: 100,
      })
      .expect(201);
    return (result.body as { id: string }).id;
  }

  it('creates, confirms, lists and reads an owned video', async () => {
    const id = await create();
    const effectiveCorrelationId = '40000000-0000-4000-8000-000000000004';
    const confirmation = await request(await app.getUrl())
      .post(`/videos/${id}/upload-completed`)
      .set('Authorization', 'Bearer user-a')
      .set('X-Correlation-Id', effectiveCorrelationId)
      .expect(200);
    expect(confirmation.body).toMatchObject({
      id,
      status: 'PENDING',
      correlationId: effectiveCorrelationId,
    });
    await request(await app.getUrl())
      .post(`/videos/${id}/upload-completed`)
      .set('Authorization', 'Bearer user-a')
      .expect(200);
    expect(confirmations.events).toHaveLength(1);
    const list = await request(await app.getUrl())
      .get('/videos')
      .set('Authorization', 'Bearer user-a')
      .expect(200);
    expect((list.body as { items: unknown[] }).items).toHaveLength(1);
    await request(await app.getUrl())
      .get(`/videos/${id}`)
      .set('Authorization', 'Bearer user-a')
      .expect(200);
  });

  it('hides foreign videos from detail, confirmation and listing', async () => {
    const id = await create('user-a');
    await request(await app.getUrl())
      .get(`/videos/${id}`)
      .set('Authorization', 'Bearer user-b')
      .expect(404);
    await request(await app.getUrl())
      .post(`/videos/${id}/upload-completed`)
      .set('Authorization', 'Bearer user-b')
      .expect(404);
    const list = await request(await app.getUrl())
      .get('/videos')
      .set('Authorization', 'Bearer user-b')
      .expect(200);
    expect((list.body as { items: unknown[] }).items).toEqual([]);
  });

  it('validates input, cursor, limit and missing storage object', async () => {
    await request(await app.getUrl())
      .post('/videos')
      .set('Authorization', 'Bearer user-a')
      .send({
        filename: '../bad.mp4',
        contentType: 'video/mp4',
        sizeBytes: 100,
      })
      .expect(400);
    await request(await app.getUrl())
      .post('/videos')
      .set('Authorization', 'Bearer user-a')
      .send({
        filename: 'too-large.mp4',
        contentType: 'video/mp4',
        sizeBytes: 2_147_483_649,
      })
      .expect(413);
    await request(await app.getUrl())
      .get('/videos/not-a-uuid')
      .set('Authorization', 'Bearer user-a')
      .expect(400);
    await request(await app.getUrl())
      .get('/videos?cursor=bad')
      .set('Authorization', 'Bearer user-a')
      .expect(400);
    await request(await app.getUrl())
      .get('/videos?limit=101')
      .set('Authorization', 'Bearer user-a')
      .expect(400);
    const id = await create();
    storage.missing = true;
    await request(await app.getUrl())
      .post(`/videos/${id}/upload-completed`)
      .set('Authorization', 'Bearer user-a')
      .expect(409);
  });

  it('returns and consumes a stable next cursor', async () => {
    await create();
    await create();
    await create();
    const first = await request(await app.getUrl())
      .get('/videos?limit=2')
      .set('Authorization', 'Bearer user-a')
      .expect(200);
    const firstBody = first.body as { page: { nextCursor: string } };
    expect(firstBody.page.nextCursor).toEqual(expect.any(String));
    const second = await request(await app.getUrl())
      .get(`/videos?limit=2&cursor=${firstBody.page.nextCursor}`)
      .set('Authorization', 'Bearer user-a')
      .expect(200);
    expect((second.body as { items: unknown[] }).items).toHaveLength(1);
  });
});
