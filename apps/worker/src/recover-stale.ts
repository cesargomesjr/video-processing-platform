import { DataSource } from 'typeorm';

import { UserEntity } from '../../../src/contexts/identity/infrastructure/typeorm/user.entity';
import { VideoEntity } from '../../../src/contexts/video-management/infrastructure/typeorm/video.entity';
import { RecoverStaleChunksUseCase } from '../../../src/contexts/video-processing/application/recover-stale-chunks.use-case';
import { RabbitMqMessagePublisher } from '../../../src/contexts/video-processing/infrastructure/rabbitmq-message-publisher';
import { ChunkEntity } from '../../../src/contexts/video-processing/infrastructure/typeorm/chunk.entity';
import { PostgresChunkRecoveryRepository } from '../../../src/contexts/video-processing/infrastructure/typeorm/postgres-chunk-recovery.repository';
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
  const publisher = new RabbitMqMessagePublisher(config.rabbitmqUrl);

  try {
    await dataSource.initialize();
    const recovery = new RecoverStaleChunksUseCase(
      new PostgresChunkRecoveryRepository(dataSource),
      publisher,
    );
    const count = await recovery.execute();
    logger.info({ count }, 'worker.recovered_chunks');
  } finally {
    await publisher.close();
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main().catch((error: unknown) => {
  new PinoLogger().error(error);
  process.exitCode = 1;
});
