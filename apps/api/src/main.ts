import type { NextFunction, Request, Response } from 'express';

import { NestFactory } from '@nestjs/core';

import { MetricsService } from '../../../src/platform/metrics/metrics.service';
import { loadAppConfig } from '../../../src/platform/config/app-config.schema';
import { createCorrelationMiddleware } from '../../../src/platform/logger/correlation.middleware';
import { PinoLogger } from '../../../src/platform/logger/pino.logger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const config = loadAppConfig();
  const logger = new PinoLogger();
  const app = await NestFactory.create(AppModule, { logger });

  app.use(createCorrelationMiddleware({ logger }));
  app.enableCors();

  const metrics = app.get(MetricsService);
  app.use((_request: Request, response: Response, next: NextFunction): void => {
    const start = process.hrtime.bigint();

    response.on('finish', () => {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      metrics.observeHttpRequestDuration(seconds);
    });

    next();
  });

  await app.listen(config.port);
}

void bootstrap();
