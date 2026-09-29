import type { Server } from 'node:http';

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../../../apps/api/src/app.module';
import { RateLimitService } from '../../../src/platform/rate-limit/rate-limit.service';
import { AggregateChunksUseCase } from '../../../src/contexts/video-processing/application/aggregate-chunks.use-case';
import { AnalyzeVideoUseCase } from '../../../src/contexts/video-processing/application/analyze-video.use-case';
import { PackageArchiveUseCase } from '../../../src/contexts/video-processing/application/package-archive.use-case';
import { PlanChunksUseCase } from '../../../src/contexts/video-processing/application/plan-chunks.use-case';
import { ProcessChunkUseCase } from '../../../src/contexts/video-processing/application/process-chunk.use-case';
import { ChunkCompletionPolicy } from '../../../src/contexts/video-processing/domain/chunk-completion-policy';
import { FFmpegFrameExtractor } from '../../../src/contexts/video-processing/infrastructure/ffmpeg-frame-extractor';
import { FFprobeAnalyzer } from '../../../src/contexts/video-processing/infrastructure/ffprobe-analyzer';
import { RabbitMqMessagePublisher } from '../../../src/contexts/video-processing/infrastructure/rabbitmq-message-publisher';
import { S3FrameStorage } from '../../../src/contexts/video-processing/infrastructure/s3-frame-storage';
import { ZipArchiveBuilder } from '../../../src/contexts/video-processing/infrastructure/zip-archive-builder';
import { PostgresChunkRepository } from '../../../src/contexts/video-processing/infrastructure/typeorm/postgres-chunk.repository';
import { VideoProcessingPipeline } from '../../../src/main/video-processing-pipeline';
import { RabbitMQMessagePublisher } from '../../../src/contexts/video-management/infrastructure/rabbitmq-message-publisher';
import { S3VideoStorage } from '../../../src/contexts/video-management/infrastructure/s3-video-storage';
import { VideoEntity } from '../../../src/contexts/video-management/infrastructure/typeorm/video.entity';
import { TypeormProcessingVideoRepository } from '../../../src/main/typeorm-processing-video.repository';
import { DATA_SOURCE, MESSAGE_PUBLISHER } from '../../../src/main/tokens';

const execFileAsync = promisify(execFile);
const BUCKET = 'fiapx-e2e';

async function waitFor(
  predicate: () => Promise<boolean> | boolean,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for condition');
}

describe('Video processing full flow (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let postgres: StartedPostgreSqlContainer;
  let minio: StartedTestContainer;
  let rabbitmq: StartedTestContainer;
  let pipeline: VideoProcessingPipeline;
  let processingPublisher: RabbitMqMessagePublisher;
  let fixture: Buffer;
  let fixtureDirectory: string;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:16-alpine').start();
    rabbitmq = await new GenericContainer('rabbitmq:3-management')
      .withExposedPorts(5672, 15672)
      .withEnvironment({
        RABBITMQ_DEFAULT_USER: 'fiapx',
        RABBITMQ_DEFAULT_PASS: 'fiapx',
      })
      .withWaitStrategy(Wait.forLogMessage(/Server startup complete/))
      .start();
    minio = await new GenericContainer('alpine/minio:latest-release')
      .withExposedPorts(9000)
      .withEnvironment({
        MINIO_ROOT_USER: 'minioadmin',
        MINIO_ROOT_PASSWORD: 'minioadmin',
      })
      .withUser('root')
      .withEntrypoint(['/bin/sh', '-c'])
      .withCommand([
        'chown -R minio:minio /data && exec su -s /bin/sh minio -c "exec minio server /data --console-address :9001"',
      ])
      .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000))
      .start();

    const s3Endpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`;
    const s3Client = new S3Client({
      endpoint: s3Endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin',
      },
      forcePathStyle: true,
    });
    await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET }));
    s3Client.destroy();

    fixtureDirectory = await mkdtemp(join(tmpdir(), 'e2e-video-'));
    const fixturePath = join(fixtureDirectory, 'fixture.mp4');
    await execFileAsync(ffmpegInstaller.path, [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc=duration=3:size=320x240:rate=1',
      '-c:v',
      'mpeg4',
      '-q:v',
      '5',
      fixturePath,
    ]);
    fixture = await readFile(fixturePath);

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = `postgres://${postgres.getUsername()}:${postgres.getPassword()}@${postgres.getHost()}:${postgres.getPort()}/${postgres.getDatabase()}`;
    process.env.RABBITMQ_URL = `amqp://fiapx:fiapx@${rabbitmq.getHost()}:${rabbitmq.getMappedPort(5672)}`;
    process.env.REDIS_URL = 'redis://unused';
    process.env.S3_ENDPOINT = s3Endpoint;
    process.env.S3_ACCESS_KEY = 'minioadmin';
    process.env.S3_SECRET_KEY = 'minioadmin';
    process.env.S3_BUCKET = BUCKET;
    process.env.JWT_SECRET = 'e2e-secret';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RateLimitService)
      .useValue({
        assertLoginAllowed: async (): Promise<void> => {},
        assertUploadAllowed: async (): Promise<void> => {},
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;

    const dataSource = app.get<DataSource>(DATA_SOURCE);
    const s3Options = {
      endpoint: s3Endpoint,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
      bucket: BUCKET,
      region: 'us-east-1',
    };
    const processingVideoRepository = new TypeormProcessingVideoRepository(dataSource);
    const chunkRepository = new PostgresChunkRepository(dataSource);
    processingPublisher = new RabbitMqMessagePublisher(process.env.RABBITMQ_URL);
    const videoStorage = new S3VideoStorage(s3Options);
    const frameStorage = new S3FrameStorage(s3Options);

    pipeline = new VideoProcessingPipeline({
      url: process.env.RABBITMQ_URL,
      analyze: new AnalyzeVideoUseCase(
        processingVideoRepository,
        videoStorage,
        new FFprobeAnalyzer(ffprobeInstaller.path),
        processingPublisher,
      ),
      planChunks: new PlanChunksUseCase(
        processingVideoRepository,
        chunkRepository,
        processingPublisher,
        2,
        100,
      ),
      processChunk: new ProcessChunkUseCase(
        chunkRepository,
        videoStorage,
        new FFmpegFrameExtractor(ffmpegInstaller.path),
        frameStorage,
        processingPublisher,
      ),
      aggregate: new AggregateChunksUseCase(
        processingVideoRepository,
        chunkRepository,
        new ChunkCompletionPolicy(),
        processingPublisher,
      ),
      packageArchive: new PackageArchiveUseCase(
        processingVideoRepository,
        frameStorage,
        new ZipArchiveBuilder(),
        videoStorage,
        processingPublisher,
      ),
    });
    await pipeline.start();
  }, 180_000);

  afterAll(async () => {
    if (pipeline !== undefined) {
      await pipeline.stop();
    }

    if (processingPublisher !== undefined) {
      await processingPublisher.close();
    }

    if (app !== undefined) {
      await app.get<RabbitMQMessagePublisher>(MESSAGE_PUBLISHER).close();
      await app.close();
    }

    if (minio !== undefined) {
      await minio.stop();
    }

    if (rabbitmq !== undefined) {
      await rabbitmq.stop();
    }

    if (postgres !== undefined) {
      await postgres.stop();
    }

    await rm(fixtureDirectory, { recursive: true, force: true });
  });

  it('uploads a video and completes the processing pipeline', async () => {
    const email = 'user@example.com';
    const password = 'Str0ngPass';

    await request(httpServer).post('/auth/register').send({ email, password }).expect(201);
    const login = await request(httpServer)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const accessToken = (login.body as { accessToken: string }).accessToken;

    const upload = await request(httpServer)
      .post('/videos')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', fixture, { filename: 'movie.mp4', contentType: 'video/mp4' })
      .expect(202);
    const videoId = (upload.body as { videoId: string }).videoId;

    await waitFor(async () => {
      const response = await request(httpServer)
        .get(`/videos/${videoId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      return (response.body as { status: string }).status === 'COMPLETED';
    }, 20_000);

    const stored = await app
      .get<DataSource>(DATA_SOURCE)
      .getRepository(VideoEntity)
      .findOneByOrFail({
        id: videoId,
      });
    const root = `user@example.com/Original/movie--${videoId}`;
    expect(stored.storageKey).toBe(`${root}/original.mp4`);
    expect(stored.zipKey).toBe(`${root}/archives/frames.zip`);

    await request(httpServer)
      .get(`/videos/${videoId}/download`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(typeof (response.body as { url: string }).url).toBe('string');
      });
  });
});
