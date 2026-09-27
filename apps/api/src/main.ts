import { NestFactory } from '@nestjs/core';

import { loadAppConfig } from '../../../src/platform/config/app-config.schema';
import { createCorrelationMiddleware } from '../../../src/platform/logger/correlation.middleware';
import { PinoLogger } from '../../../src/platform/logger/pino.logger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const config = loadAppConfig();
  const logger = new PinoLogger();
  const app = await NestFactory.create(AppModule, { logger });

  app.use(createCorrelationMiddleware({ logger }));

  await app.listen(config.port);
}

void bootstrap();
