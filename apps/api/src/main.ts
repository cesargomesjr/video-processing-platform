import type { NextFunction, Request, Response } from 'express';

import { NestFactory } from '@nestjs/core';
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';

import { MetricsService } from '../../../src/platform/metrics/metrics.service';
import { ensureVideoProcessingTopology } from '../../../src/platform/messaging/video-processing-topology';
import { loadAppConfig } from '../../../src/platform/config/app-config.schema';
import { createCorrelationMiddleware } from '../../../src/platform/logger/correlation.middleware';
import { PinoLogger } from '../../../src/platform/logger/pino.logger';
import { AppModule } from './app.module';

async function ensureS3Bucket(config: ReturnType<typeof loadAppConfig>): Promise<void> {
  const client = new S3Client({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.accessKey,
      secretAccessKey: config.s3.secretKey,
    },
    forcePathStyle: true,
  });

  try {
    await client.send(new CreateBucketCommand({ Bucket: config.s3.bucket }));
  } catch (error: unknown) {
    const name = error instanceof Error ? error.name : '';
    if (name !== 'BucketAlreadyOwnedByYou' && name !== 'BucketAlreadyExists') {
      throw error;
    }
  }
}

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

  await ensureS3Bucket(config);
  await ensureVideoProcessingTopology(config.rabbitmqUrl);
  await app.listen(config.port);
}

void bootstrap();
