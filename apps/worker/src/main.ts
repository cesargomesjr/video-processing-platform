import { DataSource } from 'typeorm';

import { AggregateChunksUseCase } from '../../../src/contexts/video-processing/application/aggregate-chunks.use-case';
import { AnalyzeVideoUseCase } from '../../../src/contexts/video-processing/application/analyze-video.use-case';
import { PackageArchiveUseCase } from '../../../src/contexts/video-processing/application/package-archive.use-case';
import { PlanChunksUseCase } from '../../../src/contexts/video-processing/application/plan-chunks.use-case';
import { ProcessChunkUseCase } from '../../../src/contexts/video-processing/application/process-chunk.use-case';
import { NotifyProcessingFailureUseCase } from '../../../src/contexts/notification/application/notify-processing-failure.use-case';
import { PostgresUserEmailResolver } from '../../../src/contexts/notification/infrastructure/postgres-user-email-resolver';
import { SmtpNotificationGateway } from '../../../src/contexts/notification/infrastructure/smtp-notification-gateway';
import { ChunkCompletionPolicy } from '../../../src/contexts/video-processing/domain/chunk-completion-policy';
import { FFmpegFrameExtractor } from '../../../src/contexts/video-processing/infrastructure/ffmpeg-frame-extractor';
import { FFprobeAnalyzer } from '../../../src/contexts/video-processing/infrastructure/ffprobe-analyzer';
import { RabbitMqMessagePublisher } from '../../../src/contexts/video-processing/infrastructure/rabbitmq-message-publisher';
import { S3FrameStorage } from '../../../src/contexts/video-processing/infrastructure/s3-frame-storage';
import { ZipArchiveBuilder } from '../../../src/contexts/video-processing/infrastructure/zip-archive-builder';
import { ChunkEntity } from '../../../src/contexts/video-processing/infrastructure/typeorm/chunk.entity';
import { PostgresChunkRepository } from '../../../src/contexts/video-processing/infrastructure/typeorm/postgres-chunk.repository';
import { VideoProcessingPipeline } from '../../../src/main/video-processing-pipeline';
import { S3VideoStorage } from '../../../src/contexts/video-management/infrastructure/s3-video-storage';
import { PostgresVideoRepository } from '../../../src/contexts/video-management/infrastructure/typeorm/postgres-video.repository';
import { VideoEntity } from '../../../src/contexts/video-management/infrastructure/typeorm/video.entity';
import { loadAppConfig } from '../../../src/platform/config/app-config.schema';
import { PinoLogger } from '../../../src/platform/logger/pino.logger';

async function main(): Promise<void> {
  const config = loadAppConfig();
  const logger = new PinoLogger();

  const dataSource = new DataSource({
    type: 'postgres',
    url: config.databaseUrl,
    entities: [VideoEntity, ChunkEntity],
    synchronize: config.nodeEnv !== 'production',
  });
  await dataSource.initialize();

  const videoRepository = new PostgresVideoRepository(dataSource);
  const chunkRepository = new PostgresChunkRepository(dataSource);
  const publisher = new RabbitMqMessagePublisher(config.rabbitmqUrl);
  const frameStorage = new S3FrameStorage(config.s3);
  const videoStorage = new S3VideoStorage(config.s3);

  const pipeline = new VideoProcessingPipeline({
    url: config.rabbitmqUrl,
    analyze: new AnalyzeVideoUseCase(
      videoRepository,
      videoStorage,
      new FFprobeAnalyzer('ffprobe'),
      publisher,
    ),
    planChunks: new PlanChunksUseCase(
      videoRepository,
      chunkRepository,
      publisher,
      config.processing.chunkSeconds,
      config.processing.maxChunks,
    ),
    processChunk: new ProcessChunkUseCase(
      chunkRepository,
      videoStorage,
      new FFmpegFrameExtractor('ffmpeg'),
      frameStorage,
      publisher,
    ),
    aggregate: new AggregateChunksUseCase(
      videoRepository,
      chunkRepository,
      new ChunkCompletionPolicy(),
      publisher,
    ),
    packageArchive: new PackageArchiveUseCase(
      videoRepository,
      frameStorage,
      new ZipArchiveBuilder(),
      videoStorage,
      publisher,
    ),
    notifyFailure: new NotifyProcessingFailureUseCase(
      new SmtpNotificationGateway({
        host: config.smtp.host,
        port: config.smtp.port,
        from: 'no-reply.com',
      }),
      new PostgresUserEmailResolver(dataSource),
    ),
  });

  await pipeline.start();
  logger.info({}, 'worker.consuming');

  const shutdown = async (): Promise<void> => {
    await pipeline.stop();
    await dataSource.destroy();
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

void main();
