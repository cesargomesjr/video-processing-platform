import { CreateBucketCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { DataSource } from 'typeorm';

import { RabbitMQMessagePublisher } from '../../../src/contexts/video-management/infrastructure/rabbitmq-message-publisher';
import { S3VideoStorage } from '../../../src/contexts/video-management/infrastructure/s3-video-storage';
import { PostgresVideoRepository } from '../../../src/contexts/video-management/infrastructure/typeorm/postgres-video.repository';
import { VideoEntity } from '../../../src/contexts/video-management/infrastructure/typeorm/video.entity';
import { Video } from '../../../src/contexts/video-management/domain/video';
import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoSize } from '../../../src/contexts/video-management/domain/video-size';
import { VideoStatus } from '../../../src/contexts/video-management/domain/video-status';
import { CompleteVideoUseCase } from '../../../src/contexts/video-processing/application/complete-video.use-case';
import { VideoUploadedConsumer } from '../../../src/contexts/video-processing/presentation/video-uploaded.consumer';

const BUCKET = 'fiapx-test';
const VIDEO_ID = '11111111-1111-1111-1111-111111111111';
const OWNER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('VideoUploadedConsumer (integration)', () => {
  let postgres: StartedPostgreSqlContainer;
  let rabbitmq: StartedTestContainer;
  let minio: StartedTestContainer;
  let dataSource: DataSource;
  let repository: PostgresVideoRepository;
  let publisher: RabbitMQMessagePublisher;
  let consumer: VideoUploadedConsumer;
  let s3Client: S3Client;

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

    dataSource = new DataSource({
      type: 'postgres',
      host: postgres.getHost(),
      port: postgres.getPort(),
      username: postgres.getUsername(),
      password: postgres.getPassword(),
      database: postgres.getDatabase(),
      entities: [VideoEntity],
      synchronize: true,
    });
    await dataSource.initialize();

    repository = new PostgresVideoRepository(dataSource);

    const s3Endpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`;
    s3Client = new S3Client({
      endpoint: s3Endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin',
      },
      forcePathStyle: true,
    });
    await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET }));

    const videoStorage = new S3VideoStorage({
      endpoint: s3Endpoint,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
      bucket: BUCKET,
      region: 'us-east-1',
    });

    const rabbitmqUrl = `amqp://fiapx:fiapx@${rabbitmq.getHost()}:${rabbitmq.getMappedPort(5672)}`;
    publisher = new RabbitMQMessagePublisher(rabbitmqUrl);
    consumer = new VideoUploadedConsumer(
      rabbitmqUrl,
      new CompleteVideoUseCase(repository, videoStorage),
    );

    await consumer.start();
  }, 180_000);

  afterAll(async () => {
    if (consumer !== undefined) {
      await consumer.stop();
    }

    if (dataSource !== undefined && dataSource.isInitialized) {
      await dataSource.destroy();
    }

    if (s3Client !== undefined) {
      s3Client.destroy();
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
  });

  it('moves an uploaded video to COMPLETED with an empty zip', async () => {
    const video = Video.create({
      id: VideoId.create(VIDEO_ID),
      ownerId: OWNER_ID,
      originalName: 'movie.mp4',
      format: VideoFormat.create('mp4'),
      size: VideoSize.create(1024, 1024 * 1024),
      storageKey: `original/${OWNER_ID}/${VIDEO_ID}.mp4`,
    });
    await repository.save(video);

    await publisher.publishVideoUploaded({
      videoId: VIDEO_ID,
      ownerId: OWNER_ID,
      storageKey: video.storageKey,
      format: 'mp4',
      sizeBytes: video.size.bytes,
    });

    const completed = await waitForCompleted(repository, VIDEO_ID, 10_000);

    expect(completed).not.toBeNull();
    expect(completed?.status).toBe(VideoStatus.COMPLETED);
    expect(completed?.zipKey).toBe(`archives/${VIDEO_ID}.zip`);

    const output = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: `archives/${VIDEO_ID}.zip` }),
    );
    const body = output.Body === undefined ? null : await output.Body.transformToByteArray();
    expect(body).not.toBeNull();
    expect(body === null ? 0 : body.length).toBeGreaterThan(0);
  });
});

async function waitForCompleted(
  repository: PostgresVideoRepository,
  videoId: string,
  timeoutMs: number,
): Promise<Video | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const video = await repository.findById(VideoId.create(videoId));
    if (video?.status === VideoStatus.COMPLETED) {
      return video;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return null;
}
