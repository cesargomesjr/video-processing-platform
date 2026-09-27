import { DataSource } from 'typeorm';

import { S3VideoStorage } from '../../../src/contexts/video-management/infrastructure/s3-video-storage';
import { PostgresVideoRepository } from '../../../src/contexts/video-management/infrastructure/typeorm/postgres-video.repository';
import { VideoEntity } from '../../../src/contexts/video-management/infrastructure/typeorm/video.entity';
import { CompleteVideoUseCase } from '../../../src/contexts/video-processing/application/complete-video.use-case';
import { VideoUploadedConsumer } from '../../../src/contexts/video-processing/presentation/video-uploaded.consumer';
import { loadAppConfig } from '../../../src/platform/config/app-config.schema';
import { PinoLogger } from '../../../src/platform/logger/pino.logger';

async function main(): Promise<void> {
  const config = loadAppConfig();
  const logger = new PinoLogger();

  const dataSource = new DataSource({
    type: 'postgres',
    url: config.databaseUrl,
    entities: [VideoEntity],
    synchronize: config.nodeEnv !== 'production',
  });

  await dataSource.initialize();

  const completeVideo = new CompleteVideoUseCase(
    new PostgresVideoRepository(dataSource),
    new S3VideoStorage(config.s3),
  );
  const consumer = new VideoUploadedConsumer(config.rabbitmqUrl, completeVideo);

  await consumer.start();
  logger.info({}, 'worker.consuming');

  const shutdown = async (): Promise<void> => {
    await consumer.stop();
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
