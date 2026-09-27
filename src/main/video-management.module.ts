import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { GetVideoStatusUseCase } from '../contexts/video-management/application/get-video-status.use-case';
import { ListUserVideosUseCase } from '../contexts/video-management/application/list-user-videos.use-case';
import { RequestDownloadUseCase } from '../contexts/video-management/application/request-download.use-case';
import { UploadVideoUseCase } from '../contexts/video-management/application/upload-video.use-case';
import { VideoOwnershipPolicy } from '../contexts/video-management/domain/video-ownership-policy';
import { FileSignatureVideoContentInspector } from '../contexts/video-management/infrastructure/file-signature-video-content-inspector';
import { RabbitMQMessagePublisher } from '../contexts/video-management/infrastructure/rabbitmq-message-publisher';
import { S3SignedUrlGenerator } from '../contexts/video-management/infrastructure/s3-signed-url-generator';
import { S3VideoStorage } from '../contexts/video-management/infrastructure/s3-video-storage';
import { PostgresVideoRepository } from '../contexts/video-management/infrastructure/typeorm/postgres-video.repository';
import { UuidIdGenerator } from '../contexts/video-management/infrastructure/uuid-id-generator';
import { VideosController } from '../contexts/video-management/presentation/videos.controller';
import { AppConfig } from '../platform/config/app-config.schema';
import { APP_CONFIG } from '../platform/config/app-config.token';
import { ConfigModule } from './config.module';
import { DatabaseModule } from './database.module';
import { MetricsModule } from './metrics.module';
import { RateLimitModule } from './rate-limit.module';
import {
  DATA_SOURCE,
  MESSAGE_PUBLISHER,
  SIGNED_URL_GENERATOR,
  VIDEO_CONTENT_INSPECTOR,
  VIDEO_ID_GENERATOR,
  VIDEO_REPOSITORY,
  VIDEO_STORAGE,
} from './tokens';

@Module({
  imports: [ConfigModule, DatabaseModule, RateLimitModule, MetricsModule],
  controllers: [VideosController],
  providers: [
    VideoOwnershipPolicy,
    {
      provide: VIDEO_REPOSITORY,
      inject: [DATA_SOURCE],
      useFactory: (dataSource: DataSource): PostgresVideoRepository =>
        new PostgresVideoRepository(dataSource),
    },
    {
      provide: VIDEO_ID_GENERATOR,
      useClass: UuidIdGenerator,
    },
    {
      provide: VIDEO_STORAGE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): S3VideoStorage => new S3VideoStorage(config.s3),
    },
    {
      provide: SIGNED_URL_GENERATOR,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): S3SignedUrlGenerator => new S3SignedUrlGenerator(config.s3),
    },
    {
      provide: MESSAGE_PUBLISHER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): RabbitMQMessagePublisher =>
        new RabbitMQMessagePublisher(config.rabbitmqUrl),
    },
    {
      provide: VIDEO_CONTENT_INSPECTOR,
      useClass: FileSignatureVideoContentInspector,
    },
    {
      provide: UploadVideoUseCase,
      inject: [
        VIDEO_REPOSITORY,
        VIDEO_STORAGE,
        MESSAGE_PUBLISHER,
        VIDEO_CONTENT_INSPECTOR,
        VIDEO_ID_GENERATOR,
        APP_CONFIG,
      ],
      useFactory: (
        videoRepository: PostgresVideoRepository,
        videoStorage: S3VideoStorage,
        messagePublisher: RabbitMQMessagePublisher,
        contentInspector: FileSignatureVideoContentInspector,
        idGenerator: UuidIdGenerator,
        config: AppConfig,
      ): UploadVideoUseCase =>
        new UploadVideoUseCase(
          videoRepository,
          videoStorage,
          messagePublisher,
          contentInspector,
          idGenerator,
          config.videoManagement.maxSizeBytes,
        ),
    },
    {
      provide: ListUserVideosUseCase,
      inject: [VIDEO_REPOSITORY],
      useFactory: (videoRepository: PostgresVideoRepository): ListUserVideosUseCase =>
        new ListUserVideosUseCase(videoRepository),
    },
    {
      provide: GetVideoStatusUseCase,
      inject: [VIDEO_REPOSITORY, VideoOwnershipPolicy],
      useFactory: (
        videoRepository: PostgresVideoRepository,
        ownershipPolicy: VideoOwnershipPolicy,
      ): GetVideoStatusUseCase => new GetVideoStatusUseCase(videoRepository, ownershipPolicy),
    },
    {
      provide: RequestDownloadUseCase,
      inject: [VIDEO_REPOSITORY, VideoOwnershipPolicy, SIGNED_URL_GENERATOR, APP_CONFIG],
      useFactory: (
        videoRepository: PostgresVideoRepository,
        ownershipPolicy: VideoOwnershipPolicy,
        signedUrlGenerator: S3SignedUrlGenerator,
        config: AppConfig,
      ): RequestDownloadUseCase =>
        new RequestDownloadUseCase(
          videoRepository,
          ownershipPolicy,
          signedUrlGenerator,
          config.videoManagement.downloadUrlTtlSeconds,
        ),
    },
  ],
})
export class VideoManagementModule {}
