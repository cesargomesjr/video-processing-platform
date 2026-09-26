import {
  Inject,
  Module,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketVersioningCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Pool } from 'pg';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/load-app-config.js';
import { IdentityModule } from './identity.module.js';
import {
  VideoRepository,
  VideoStorage,
  VideoConfirmationUnitOfWork,
  OutboxRepository,
  IntegrationEventPublisher,
  IdentifierGenerator,
} from '../../contexts/video-management/application/ports/video-ports.js';
import { CreateVideoUpload } from '../../contexts/video-management/application/use-cases/create-video-upload.js';
import { ConfirmVideoUpload } from '../../contexts/video-management/application/use-cases/confirm-video-upload.js';
import {
  GetUserVideo,
  ListUserVideos,
} from '../../contexts/video-management/application/use-cases/query-videos.js';
import { DispatchPendingIntegrationEvents } from '../../contexts/video-management/application/use-cases/dispatch-outbox.js';
import { RandomIdentifierGenerator } from '../../contexts/video-management/infrastructure/identity/random-identifier-generator.js';
import { RabbitMqIntegrationEventPublisher } from '../../contexts/video-management/infrastructure/messaging/rabbitmq-integration-event-publisher.js';
import { PostgresOutboxRepository } from '../../contexts/video-management/infrastructure/persistence/postgres-outbox-repository.js';
import { PostgresVideoConfirmationUnitOfWork } from '../../contexts/video-management/infrastructure/persistence/postgres-video-confirmation-unit-of-work.js';
import { PostgresVideoRepository } from '../../contexts/video-management/infrastructure/persistence/postgres-video-repository.js';
import { MinioVideoStorage } from '../../contexts/video-management/infrastructure/storage/minio-video-storage.js';
import { VideoController } from '../../contexts/video-management/presentation/http/video.controller.js';
import { SqlClient } from '../../platform/database/sql-client.js';
import {
  MessageBrokerReadiness,
  ObjectStorageReadiness,
} from '../../platform/health/application/service-readiness.js';
import { MinioObjectStorageReadiness } from '../../platform/health/infrastructure/minio-object-storage-readiness.js';
import { RabbitMqMessageBrokerReadiness } from '../../platform/health/infrastructure/rabbitmq-message-broker-readiness.js';

const MINIO_OPERATIONS = Symbol('MINIO_OPERATIONS');
const MINIO_SIGNING = Symbol('MINIO_SIGNING');

function minioClient(endpoint: string, config: AppConfig): S3Client {
  return new S3Client({
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.objectStorageAccessKey,
      secretAccessKey: config.objectStorageSecretKey,
    },
    region: 'us-east-1',
  });
}

class VideoManagementLifecycle
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private timer: NodeJS.Timeout | null = null;
  private dispatchInFlight: Promise<number> | null = null;
  public constructor(
    @Inject(DispatchPendingIntegrationEvents)
    private readonly dispatcher: DispatchPendingIntegrationEvents,
    @Inject(IntegrationEventPublisher)
    private readonly publisher: RabbitMqIntegrationEventPublisher,
    @Inject(MINIO_OPERATIONS)
    private readonly objectStorage: S3Client,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private dispatchOnce(): void {
    if (this.dispatchInFlight !== null) return;
    const execution = this.dispatcher
      .execute(this.config.outboxBatchSize)
      .catch(() => 0);
    this.dispatchInFlight = execution;
    void execution.finally(() => {
      if (this.dispatchInFlight === execution) this.dispatchInFlight = null;
    });
  }

  public async onApplicationBootstrap(): Promise<void> {
    if (this.config.nodeEnv === 'test') return;
    try {
      await this.objectStorage.send(
        new HeadBucketCommand({ Bucket: this.config.objectStorageBucket }),
      );
    } catch {
      await this.objectStorage.send(
        new CreateBucketCommand({ Bucket: this.config.objectStorageBucket }),
      );
    }
    await this.objectStorage.send(
      new PutBucketVersioningCommand({
        Bucket: this.config.objectStorageBucket,
        VersioningConfiguration: { Status: 'Enabled' },
      }),
    );
    this.timer = setInterval(() => {
      this.dispatchOnce();
    }, this.config.outboxIntervalMs);
    this.timer.unref();
  }
  public async onApplicationShutdown(): Promise<void> {
    if (this.timer !== null) clearInterval(this.timer);
    if (this.dispatchInFlight !== null) await this.dispatchInFlight;
    await this.publisher.close();
  }
}

@Module({
  imports: [IdentityModule],
  controllers: [VideoController],
  providers: [
    {
      provide: MINIO_OPERATIONS,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): S3Client =>
        minioClient(config.objectStorageEndpoint, config),
    },
    {
      provide: MINIO_SIGNING,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): S3Client =>
        minioClient(config.objectStoragePublicEndpoint, config),
    },
    {
      provide: VideoRepository,
      inject: [SqlClient],
      useFactory: (client: SqlClient): VideoRepository =>
        new PostgresVideoRepository(client),
    },
    {
      provide: VideoConfirmationUnitOfWork,
      inject: [Pool],
      useFactory: (pool: Pool): VideoConfirmationUnitOfWork =>
        new PostgresVideoConfirmationUnitOfWork(pool),
    },
    {
      provide: OutboxRepository,
      inject: [Pool],
      useFactory: (pool: Pool): OutboxRepository =>
        new PostgresOutboxRepository(pool),
    },
    { provide: IdentifierGenerator, useClass: RandomIdentifierGenerator },
    {
      provide: VideoStorage,
      inject: [MINIO_OPERATIONS, MINIO_SIGNING, APP_CONFIG],
      useFactory: (
        operations: S3Client,
        signing: S3Client,
        config: AppConfig,
      ): VideoStorage =>
        new MinioVideoStorage(operations, signing, config.objectStorageBucket),
    },
    {
      provide: IntegrationEventPublisher,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): IntegrationEventPublisher =>
        new RabbitMqIntegrationEventPublisher(config.rabbitmqUrl),
    },
    {
      provide: CreateVideoUpload,
      inject: [VideoRepository, VideoStorage, IdentifierGenerator, APP_CONFIG],
      useFactory: (
        repository: VideoRepository,
        storage: VideoStorage,
        ids: IdentifierGenerator,
        config: AppConfig,
      ): CreateVideoUpload =>
        new CreateVideoUpload(
          repository,
          storage,
          ids,
          config.videoUploadMaxBytes,
          config.videoUploadTtlSeconds,
        ),
    },
    {
      provide: ConfirmVideoUpload,
      inject: [
        VideoRepository,
        VideoStorage,
        VideoConfirmationUnitOfWork,
        IdentifierGenerator,
      ],
      useFactory: (
        repository: VideoRepository,
        storage: VideoStorage,
        unitOfWork: VideoConfirmationUnitOfWork,
        ids: IdentifierGenerator,
      ): ConfirmVideoUpload =>
        new ConfirmVideoUpload(repository, storage, unitOfWork, ids),
    },
    {
      provide: ListUserVideos,
      inject: [VideoRepository],
      useFactory: (repository: VideoRepository): ListUserVideos =>
        new ListUserVideos(repository),
    },
    {
      provide: GetUserVideo,
      inject: [VideoRepository],
      useFactory: (repository: VideoRepository): GetUserVideo =>
        new GetUserVideo(repository),
    },
    {
      provide: DispatchPendingIntegrationEvents,
      inject: [OutboxRepository, IntegrationEventPublisher],
      useFactory: (
        outbox: OutboxRepository,
        publisher: IntegrationEventPublisher,
      ): DispatchPendingIntegrationEvents =>
        new DispatchPendingIntegrationEvents(outbox, publisher),
    },
    {
      provide: ObjectStorageReadiness,
      inject: [MINIO_OPERATIONS, APP_CONFIG],
      useFactory: (
        client: S3Client,
        config: AppConfig,
      ): ObjectStorageReadiness =>
        new MinioObjectStorageReadiness(client, config.objectStorageBucket),
    },
    {
      provide: MessageBrokerReadiness,
      inject: [IntegrationEventPublisher],
      useFactory: (
        publisher: RabbitMqIntegrationEventPublisher,
      ): MessageBrokerReadiness =>
        new RabbitMqMessageBrokerReadiness(publisher),
    },
    VideoManagementLifecycle,
  ],
  exports: [MessageBrokerReadiness, ObjectStorageReadiness],
})
export class VideoManagementModule {}
