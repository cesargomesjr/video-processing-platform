import type { Server } from 'node:http';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';

import { AppModule } from '../../../apps/api/src/app.module';
import {
  MessagePublisher,
  VideoUploadedEvent,
} from '../../../src/contexts/video-management/application/ports/message-publisher';
import {
  SignedUrl,
  SignedUrlGenerator,
} from '../../../src/contexts/video-management/application/ports/signed-url-generator';
import { VideoStorage } from '../../../src/contexts/video-management/application/ports/video-storage';
import { MESSAGE_PUBLISHER, SIGNED_URL_GENERATOR, VIDEO_STORAGE } from '../../../src/main/tokens';

const mp4Content = Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.alloc(8)]);

class FakeVideoStorage implements VideoStorage {
  public readonly stored = new Map<string, Buffer>();

  public put(key: string, content: Buffer): Promise<void> {
    this.stored.set(key, content);
    return Promise.resolve();
  }

  public get(key: string): Promise<Buffer> {
    return Promise.resolve(this.stored.get(key) ?? Buffer.alloc(0));
  }
}

class FakeMessagePublisher implements MessagePublisher {
  public readonly published: VideoUploadedEvent[] = [];

  public publishVideoUploaded(event: VideoUploadedEvent): Promise<void> {
    this.published.push(event);
    return Promise.resolve();
  }
}

class FakeSignedUrlGenerator implements SignedUrlGenerator {
  public generate(key: string, expiresInSeconds: number): Promise<SignedUrl> {
    return Promise.resolve({
      url: `https://storage.example/${key}`,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    });
  }
}

describe('Videos (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let container: StartedPostgreSqlContainer;
  let fakeStorage: FakeVideoStorage;
  let fakePublisher: FakeMessagePublisher;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    const databaseUrl = `postgres://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getPort()}/${container.getDatabase()}`;

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = databaseUrl;
    process.env.RABBITMQ_URL = 'amqp://unused';
    process.env.REDIS_URL = 'redis://unused';
    process.env.S3_ENDPOINT = 'http://unused';
    process.env.S3_ACCESS_KEY = 'unused';
    process.env.S3_SECRET_KEY = 'unused';
    process.env.S3_BUCKET = 'unused';
    process.env.JWT_SECRET = 'e2e-secret';

    fakeStorage = new FakeVideoStorage();
    fakePublisher = new FakeMessagePublisher();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(VIDEO_STORAGE)
      .useValue(fakeStorage)
      .overrideProvider(MESSAGE_PUBLISHER)
      .useValue(fakePublisher)
      .overrideProvider(SIGNED_URL_GENERATOR)
      .useValue(new FakeSignedUrlGenerator())
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  async function registerAndLogin(email: string): Promise<string> {
    await request(httpServer)
      .post('/auth/register')
      .send({ email, password: 'Str0ngPass' })
      .expect(201);

    const login = await request(httpServer)
      .post('/auth/login')
      .send({ email, password: 'Str0ngPass' })
      .expect(200);

    return (login.body as { accessToken: string }).accessToken;
  }

  it('requires a token to upload', async () => {
    await request(httpServer).post('/videos').attach('file', mp4Content, 'movie.mp4').expect(401);
  });

  it('uploads, lists and reads the status for the owner', async () => {
    const token = await registerAndLogin('uploader@example.com');

    const upload = await request(httpServer)
      .post('/videos')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', mp4Content, { filename: 'movie.mp4', contentType: 'video/mp4' })
      .expect(202);

    const body = upload.body as { videoId: string; status: string };
    expect(body.videoId).not.toHaveLength(0);
    expect(body.status).toBe('PENDING');

    await request(httpServer)
      .get('/videos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        const result = response.body as {
          items: Array<{ videoId: string; status: string }>;
          total: number;
        };
        expect(result.total).toBe(1);
        expect(result.items[0]?.videoId).toBe(body.videoId);
        expect(result.items[0]?.status).toBe('PENDING');
      });

    await request(httpServer)
      .get(`/videos/${body.videoId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({ videoId: body.videoId, status: 'PENDING' });
      });

    expect(fakeStorage.stored.size).toBe(1);
    expect(fakePublisher.published).toHaveLength(1);
  });

  it('isolates videos between users', async () => {
    const tokenA = await registerAndLogin('user-a@example.com');
    await request(httpServer)
      .post('/videos')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', mp4Content, { filename: 'a.mp4', contentType: 'video/mp4' })
      .expect(202);

    const tokenB = await registerAndLogin('user-b@example.com');
    await request(httpServer)
      .get('/videos')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200)
      .expect((response) => {
        const result = response.body as { total: number };
        expect(result.total).toBe(0);
      });
  });

  it('rejects an unsupported file format', async () => {
    const token = await registerAndLogin('bad-format@example.com');

    await request(httpServer)
      .post('/videos')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('not a video'), 'movie.exe')
      .expect(400);
  });
});
