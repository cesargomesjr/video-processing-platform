import { DataSource } from 'typeorm';

import { AggregateChunksUseCase } from '../../../src/contexts/video-processing/application/aggregate-chunks.use-case';
import { AnalyzeVideoUseCase } from '../../../src/contexts/video-processing/application/analyze-video.use-case';
import { PackageArchiveUseCase } from '../../../src/contexts/video-processing/application/package-archive.use-case';
import { PlanChunksUseCase } from '../../../src/contexts/video-processing/application/plan-chunks.use-case';
import { ProcessChunkUseCase } from '../../../src/contexts/video-processing/application/process-chunk.use-case';
import { RecoverStaleChunksUseCase } from '../../../src/contexts/video-processing/application/recover-stale-chunks.use-case';
import { NotifyProcessingCompletionUseCase } from '../../../src/contexts/notification/application/notify-processing-completion.use-case';
import { NotifyProcessingFailureUseCase } from '../../../src/contexts/notification/application/notify-processing-failure.use-case';
import { UserEntity } from '../../../src/contexts/identity/infrastructure/typeorm/user.entity';
import { PostgresUserEmailResolver } from '../../../src/main/postgres-user-email-resolver';
import { SmtpNotificationGateway } from '../../../src/contexts/notification/infrastructure/smtp-notification-gateway';
import { ChunkCompletionPolicy } from '../../../src/contexts/video-processing/domain/chunk-completion-policy';
import { FFmpegFrameExtractor } from '../../../src/contexts/video-processing/infrastructure/ffmpeg-frame-extractor';
import { FFprobeAnalyzer } from '../../../src/contexts/video-processing/infrastructure/ffprobe-analyzer';
import { RabbitMqMessagePublisher } from '../../../src/contexts/video-processing/infrastructure/rabbitmq-message-publisher';
import { S3FrameStorage } from '../../../src/contexts/video-processing/infrastructure/s3-frame-storage';
import { ZipArchiveBuilder } from '../../../src/contexts/video-processing/infrastructure/zip-archive-builder';
import { ChunkEntity } from '../../../src/contexts/video-processing/infrastructure/typeorm/chunk.entity';
import { PostgresChunkRepository } from '../../../src/contexts/video-processing/infrastructure/typeorm/postgres-chunk.repository';
import { PostgresChunkRecoveryRepository } from '../../../src/contexts/video-processing/infrastructure/typeorm/postgres-chunk-recovery.repository';
import { VideoProcessingPipeline } from '../../../src/main/video-processing-pipeline';
import { S3VideoStorage } from '../../../src/contexts/video-management/infrastructure/s3-video-storage';
import { TypeormProcessingVideoRepository } from '../../../src/main/typeorm-processing-video.repository';
import { VideoEntity } from '../../../src/contexts/video-management/infrastructure/typeorm/video.entity';
import { loadAppConfig } from '../../../src/platform/config/app-config.schema';
import { PinoLogger } from '../../../src/platform/logger/pino.logger';

async function main(): Promise<void> {
  const config = loadAppConfig();
  const logger = new PinoLogger();

  const dataSource = new DataSource({
    type: 'postgres',
    url: config.databaseUrl,
    entities: [VideoEntity, ChunkEntity, UserEntity],
    synchronize: config.nodeEnv !== 'production',
  });
  await dataSource.initialize();

  const videoRepository = new TypeormProcessingVideoRepository(dataSource);
  const chunkRepository = new PostgresChunkRepository(dataSource);
  const publisher = new RabbitMqMessagePublisher(config.rabbitmqUrl);
  const frameStorage = new S3FrameStorage(config.s3);
  const videoStorage = new S3VideoStorage(config.s3);
  const notificationGateway = new SmtpNotificationGateway({
    host: config.smtp.host,
    port: config.smtp.port,
    from: 'no-reply@fiapx.local',
  });
  const userEmailResolver = new PostgresUserEmailResolver(dataSource);

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
    notifyFailure: new NotifyProcessingFailureUseCase(notificationGateway, userEmailResolver),
    notifyCompletion: new NotifyProcessingCompletionUseCase(notificationGateway, userEmailResolver),
  });

  await pipeline.start();
  logger.info({}, 'worker.consuming');

  const recovery = new RecoverStaleChunksUseCase(
    new PostgresChunkRecoveryRepository(dataSource),
    publisher,
  );
  let recovering = false;
  const recover = async (): Promise<void> => {
    if (recovering) {
      return;
    }

    recovering = true;
    try {
      const count = await recovery.execute();
      if (count > 0) {
        logger.info({ count }, 'worker.recovered_chunks');
      }
    } catch (error) {
      logger.error(error);
    } finally {
      recovering = false;
    }
  };
  await recover();
  const recoveryInterval = setInterval(() => void recover(), 60_000);

  const shutdown = async (): Promise<void> => {
    clearInterval(recoveryInterval);
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
