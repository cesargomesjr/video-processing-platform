import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import {
  CreateBucketCommand,
  GetObjectCommand,
  ListObjectsV2Command,
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
  ChunkFailedEvent,
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
import { TypeormProcessingVideoRepository } from '../../../src/main/typeorm-processing-video.repository';
import { VideoEntity } from '../../../src/contexts/video-management/infrastructure/typeorm/video.entity';

const execFileAsync = promisify(execFile);
const BUCKET = 'fiapx-pipeline-test';
const VIDEO_ID = '11111111-1111-1111-1111-111111111111';
const OWNER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ROOT = `email@email.com.br/Original/fixture--${VIDEO_ID}`;
const STORAGE_KEY = `${ROOT}/original.mp4`;
const ZIP_KEY = `${ROOT}/archives/frames.zip`;

class FakeMessagePublisher implements MessagePublisher {
  public readonly analyzed: VideoAnalyzedEvent[] = [];
  public readonly processed: ProcessVideoChunkEvent[] = [];
  public readonly completed: ChunkCompletedEvent[] = [];
  public readonly chunkFailed: ChunkFailedEvent[] = [];
  public readonly all: AllChunksCompletedEvent[] = [];
  public readonly videoCompleted: VideoCompletedEvent[] = [];
  public readonly failed: VideoProcessingFailedEvent[] = [];

  public publishVideoAnalyzed(event: VideoAnalyzedEvent): Promise<void> {
    this.analyzed.push(event);
    return Promise.resolve();
  }

  public publishProcessVideoChunk(event: ProcessVideoChunkEvent): Promise<void> {
    this.processed.push(event);
    return Promise.resolve();
  }

  public publishChunkCompleted(event: ChunkCompletedEvent): Promise<void> {
    this.completed.push(event);
    return Promise.resolve();
  }

  public publishChunkFailed(event: ChunkFailedEvent): Promise<void> {
    this.chunkFailed.push(event);
    return Promise.resolve();
  }

  public publishAllChunksCompleted(event: AllChunksCompletedEvent): Promise<void> {
    this.all.push(event);
    return Promise.resolve();
  }

  public publishVideoCompleted(event: VideoCompletedEvent): Promise<void> {
    this.videoCompleted.push(event);
    return Promise.resolve();
  }

  public publishVideoProcessingFailed(event: VideoProcessingFailedEvent): Promise<void> {
    this.failed.push(event);
    return Promise.resolve();
  }
}

describe('video-processing pipeline (integration)', () => {
  let postgres: StartedPostgreSqlContainer;
  let minio: StartedTestContainer;
  let dataSource: DataSource;
  let s3Client: S3Client;
  let fixturePath: string;
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

    fixtureDirectory = await mkdtemp(join(tmpdir(), 'pipeline-'));
    fixturePath = join(fixtureDirectory, 'fixture.mp4');
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

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: STORAGE_KEY,
        Body: await readFile(fixturePath),
      }),
    );
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

  it('processes a real video through chunks into a zip', async () => {
    const s3Endpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`;
    const s3Options = {
      endpoint: s3Endpoint,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
      bucket: BUCKET,
      region: 'us-east-1',
    };

    const videoRepository = new PostgresVideoRepository(dataSource);
    const processingVideoRepository = new TypeormProcessingVideoRepository(dataSource);
    const chunkRepository = new PostgresChunkRepository(dataSource);
    const publisher = new FakeMessagePublisher();
    const videoStorage = new S3VideoStorage(s3Options);

    await videoRepository.save(
      Video.create({
        id: VideoId.create(VIDEO_ID),
        ownerId: OWNER_ID,
        originalName: 'fixture.mp4',
        format: VideoFormat.create('mp4'),
        size: VideoSize.create(11_570, 100 * 1024 * 1024),
        storageKey: STORAGE_KEY,
      }),
    );

    const analyze = new AnalyzeVideoUseCase(
      processingVideoRepository,
      videoStorage,
      new FFprobeAnalyzer(ffprobeInstaller.path),
      publisher,
    );
    await analyze.execute({ videoId: VIDEO_ID });

    const chunkSeconds = 2;
    const planChunks = new PlanChunksUseCase(
      processingVideoRepository,
      chunkRepository,
      publisher,
      chunkSeconds,
      100,
    );
    await planChunks.execute({ videoId: VIDEO_ID });

    const analyzed = await videoRepository.findById(VideoId.create(VIDEO_ID));
    const plan = ChunkPlan.create(analyzed?.durationMs ?? 0, chunkSeconds, 100);
    const frameStorage = new S3FrameStorage(s3Options);
    const processChunk = new ProcessChunkUseCase(
      chunkRepository,
      videoStorage,
      new FFmpegFrameExtractor(ffmpegInstaller.path),
      frameStorage,
      publisher,
    );

    for (const [index, window] of plan.windows.entries()) {
      await processChunk.execute({
        videoId: VIDEO_ID,
        chunkIndex: index,
        startSeconds: window.startMs / 1_000,
        durationSeconds: window.durationMs / 1_000,
        storageKey: STORAGE_KEY,
      });
    }

    const aggregate = new AggregateChunksUseCase(
      processingVideoRepository,
      chunkRepository,
      new ChunkCompletionPolicy(),
      publisher,
    );
    await aggregate.execute({ videoId: VIDEO_ID });

    const packageArchive = new PackageArchiveUseCase(
      processingVideoRepository,
      frameStorage,
      new ZipArchiveBuilder(),
      videoStorage,
      publisher,
    );
    await packageArchive.execute({ videoId: VIDEO_ID });

    const frames = await s3Client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `${ROOT}/frames/` }),
    );
    expect(frames.Contents?.map((item) => item.Key)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^email@email\.com\.br\/Original\/fixture--.+\/frames\/0\/frame_.*\.png$/,
        ),
      ]),
    );

    const completed = await videoRepository.findById(VideoId.create(VIDEO_ID));
    expect(completed?.status).toBe(VideoStatus.COMPLETED);
    expect(completed?.zipKey).toBe(ZIP_KEY);

    const zip = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: ZIP_KEY }));
    const zipBody = zip.Body === undefined ? null : await zip.Body.transformToByteArray();
    expect(zipBody).not.toBeNull();
  });
});
