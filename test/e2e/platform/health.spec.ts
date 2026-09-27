import type { Server } from 'node:http';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';

import { AppModule } from '../../../apps/api/src/app.module';
import { RateLimitService } from '../../../src/platform/rate-limit/rate-limit.service';

describe('Health (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = `postgres://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getPort()}/${container.getDatabase()}`;
    process.env.RABBITMQ_URL = 'amqp://unused';
    process.env.REDIS_URL = 'redis://unused';
    process.env.S3_ENDPOINT = 'http://unused';
    process.env.S3_ACCESS_KEY = 'unused';
    process.env.S3_SECRET_KEY = 'unused';
    process.env.S3_BUCKET = 'unused';
    process.env.JWT_SECRET = 'e2e-secret';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RateLimitService)
      .useValue({
        assertLoginAllowed: async (): Promise<void> => {},
        assertUploadAllowed: async (): Promise<void> => {},
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  it('reports liveness and readiness', async () => {
    await request(httpServer).get('/health/live').expect(200).expect({ status: 'ok' });
    await request(httpServer).get('/health/ready').expect(200).expect({ status: 'ready' });
  });
});
