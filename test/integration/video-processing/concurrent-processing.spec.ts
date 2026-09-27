import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import {
  CreateBucketCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { DataSource } from 'typeorm';

import { AggregateChunksUseCase } from '../../../src/contexts/video-processing/application/aggregate-chunks.use-case';
import { AnalyzeVideoUseCase } from '../../../src/contexts/video-processing/application/analyze-video.use-case';
import { PackageArchiveUseCase } from '../../../src/contexts/video-processing/application/package-archive.use-case';
import { PlanChunksUseCase } from '../../../src/contexts/video-processing/application/plan-chunks.use-case';
import { ProcessChunkUseCase } from '../../../src/contexts/video-processing/application/process-chunk.use-case';
import {
  AllChunksCompletedEvent,
  ChunkCompletedEvent,
  MessagePublisher,
  ProcessVideoChunkEvent,
  VideoAnalyzedEvent,
  VideoCompletedEvent,
  VideoProcessingFailedEvent,
} from '../../../src/contexts/video-processing/application/ports/message-publisher';
import { ChunkCompletionPolicy } from '../../../src/contexts/video-processing/domain/chunk-completion-policy';
import { ChunkPlan } from '../../../src/contexts/video-processing/domain/chunk-plan';
import { FFmpegFrameExtractor } from '../../../src/contexts/video-processing/infrastructure/ffmpeg-frame-extractor';
import { FFprobeAnalyzer } from '../../../src/contexts/video-processing/infrastructure/ffprobe-analyzer';
import { S3FrameStorage } from '../../../src/contexts/video-processing/infrastructure/s3-frame-storage';
import { ZipArchiveBuilder } from '../../../src/contexts/video-processing/infrastructure/zip-archive-builder';
import { PostgresChunkRepository } from '../../../src/contexts/video-processing/infrastructure/typeorm/postgres-chunk.repository';
import { ChunkEntity } from '../../../src/contexts/video-processing/infrastructure/typeorm/chunk.entity';
import { Video } from '../../../src/contexts/video-management/domain/video';
import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoSize } from '../../../src/contexts/video-management/domain/video-size';
import { VideoStatus } from '../../../src/contexts/video-management/domain/video-status';
import { S3VideoStorage } from '../../../src/contexts/video-management/infrastructure/s3-video-storage';
import { PostgresVideoRepository } from '../../../src/contexts/video-management/infrastructure/typeorm/postgres-video.repository';
import { VideoEntity } from '../../../src/contexts/video-management/infrastructure/typeorm/video.entity';

const execFileAsync = promisify(execFile);
const BUCKET = 'fiapx-concurrent-test';

class NoopMessagePublisher implements MessagePublisher {
  public publishVideoAnalyzed(event: VideoAnalyzedEvent): Promise<void> {
    void event;
    return Promise.resolve();
  }

  public publishProcessVideoChunk(event: ProcessVideoChunkEvent): Promise<void> {
    void event;
    return Promise.resolve();
  }

  public publishChunkCompleted(event: ChunkCompletedEvent): Promise<void> {
    void event;
    return Promise.resolve();
  }

  public publishAllChunksCompleted(event: AllChunksCompletedEvent): Promise<void> {
    void event;
    return Promise.resolve();
  }

  public publishVideoCompleted(event: VideoCompletedEvent): Promise<void> {
    void event;
    return Promise.resolve();
  }

  public publishVideoProcessingFailed(event: VideoProcessingFailedEvent): Promise<void> {
    void event;
    return Promise.resolve();
  }
}

const VIDEO_IDS = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
];

describe('concurrent video processing (integration)', () => {
  let postgres: StartedPostgreSqlContainer;
  let minio: StartedTestContainer;
  let dataSource: DataSource;
  let s3Client: S3Client;
  let fixtureDirectory: string;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:16-alpine').start();
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

    dataSource = new DataSource({
      type: 'postgres',
      host: postgres.getHost(),
      port: postgres.getPort(),
      username: postgres.getUsername(),
      password: postgres.getPassword(),
      database: postgres.getDatabase(),
      entities: [VideoEntity, ChunkEntity],
      synchronize: true,
    });
    await dataSource.initialize();

    const endpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`;
    s3Client = new S3Client({
      endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin',
      },
      forcePathStyle: true,
    });
    await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET }));

    fixtureDirectory = await mkdtemp(join(tmpdir(), 'concurrent-'));
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
    const content = await readFile(fixturePath);

    for (const videoId of VIDEO_IDS) {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: `original/${videoId}.mp4`,
          Body: content,
        }),
      );
    }
  }, 180_000);

  afterAll(async () => {
    if (dataSource !== undefined && dataSource.isInitialized) {
      await dataSource.destroy();
    }

    if (s3Client !== undefined) {
      s3Client.destroy();
    }

    if (minio !== undefined) {
      await minio.stop();
    }

    if (postgres !== undefined) {
      await postgres.stop();
    }

    await rm(fixtureDirectory, { recursive: true, force: true });
  });

  it('processes three videos concurrently', async () => {
    const endpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`;
    const s3Options = {
      endpoint,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
      bucket: BUCKET,
      region: 'us-east-1',
    };

    const videoRepository = new PostgresVideoRepository(dataSource);
    const chunkRepository = new PostgresChunkRepository(dataSource);
    const publisher = new NoopMessagePublisher();
    const videoStorage = new S3VideoStorage(s3Options);
    const frameStorage = new S3FrameStorage(s3Options);

    for (const videoId of VIDEO_IDS) {
      await videoRepository.save(
        Video.create({
          id: VideoId.create(videoId),
          ownerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          originalName: 'fixture.mp4',
          format: VideoFormat.create('mp4'),
          size: VideoSize.create(11_570, 100 * 1024 * 1024),
          storageKey: `original/${videoId}.mp4`,
        }),
      );
    }

    await Promise.all(
      VIDEO_IDS.map(async (videoId) => {
        const analyze = new AnalyzeVideoUseCase(
          videoRepository,
          videoStorage,
          new FFprobeAnalyzer(ffprobeInstaller.path),
          publisher,
        );
        await analyze.execute({ videoId });

        const planChunks = new PlanChunksUseCase(
          videoRepository,
          chunkRepository,
          publisher,
          2,
          100,
        );
        await planChunks.execute({ videoId });

        const video = await videoRepository.findById(VideoId.create(videoId));
        const plan = ChunkPlan.create(video?.durationMs ?? 0, 2, 100);
        const processChunk = new ProcessChunkUseCase(
          chunkRepository,
          videoStorage,
          new FFmpegFrameExtractor(ffmpegInstaller.path),
          frameStorage,
          publisher,
        );

        await Promise.all(
          plan.windows.map((window, index) =>
            processChunk.execute({
              videoId,
              chunkIndex: index,
              startSeconds: window.startMs / 1_000,
              durationSeconds: window.durationMs / 1_000,
              storageKey: `original/${videoId}.mp4`,
            }),
          ),
        );

        const aggregate = new AggregateChunksUseCase(
          videoRepository,
          chunkRepository,
          new ChunkCompletionPolicy(),
          publisher,
        );
        await aggregate.execute({ videoId });

        const packageArchive = new PackageArchiveUseCase(
          videoRepository,
          frameStorage,
          new ZipArchiveBuilder(),
          videoStorage,
          publisher,
        );
        await packageArchive.execute({ videoId });
      }),
    );

    for (const videoId of VIDEO_IDS) {
      const video = await videoRepository.findById(VideoId.create(videoId));
      expect(video?.status).toBe(VideoStatus.COMPLETED);
      expect(video?.zipKey).toBe(`archives/${videoId}.zip`);

      const zip = await s3Client.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: `archives/${videoId}.zip` }),
      );
      const body = zip.Body === undefined ? null : await zip.Body.transformToByteArray();
      expect(body).not.toBeNull();
    }
  });
});
