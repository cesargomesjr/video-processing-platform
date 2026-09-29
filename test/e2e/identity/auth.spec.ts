import type { Server } from 'node:http';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';

import { AppModule } from '../../../apps/api/src/app.module';
import { RateLimitService } from '../../../src/platform/rate-limit/rate-limit.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    const databaseUrl = `postgres://${container.getUsername()}:${container.getPassword()}@${container.getHost()}:${container.getPort()}/${container.getDatabase()}`;

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = databaseUrl;
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

  it('rejects access to a protected route without a token', async () => {
    await request(httpServer).get('/auth/me').expect(401);
  });

  it('rejects access to a protected route with an invalid token', async () => {
    await request(httpServer)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('registers, logs in and reads the authenticated user', async () => {
    await request(httpServer)
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'Str0ngPass' })
      .expect(201);

    const loginResponse = await request(httpServer)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'Str0ngPass' })
      .expect(200);

    const body = loginResponse.body as { accessToken: string };
    const { accessToken } = body;

    await request(httpServer)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response) => {
        const me = response.body as { id: string };
        expect(typeof me.id).toBe('string');
        expect(me.id).not.toHaveLength(0);
      });
  });

  it('rejects a duplicate email', async () => {
    await request(httpServer)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'Str0ngPass' })
      .expect(201);

    await request(httpServer)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'OtherPass1' })
      .expect(409);
  });

  it('rejects login with wrong credentials', async () => {
    await request(httpServer)
      .post('/auth/register')
      .send({ email: 'login@example.com', password: 'Str0ngPass' })
      .expect(201);

    await request(httpServer)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'WrongPass1' })
      .expect(401);

    await request(httpServer)
      .post('/auth/login')
      .send({ email: 'missing@example.com', password: 'Str0ngPass' })
      .expect(401);
  });

  it('rejects invalid email and weak password', async () => {
    await request(httpServer)
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'Str0ngPass' })
      .expect(400);

    await request(httpServer)
      .post('/auth/register')
      .send({ email: 'weak@example.com', password: 'short' })
      .expect(400);
  });

  it('rejects malformed request bodies', async () => {
    await request(httpServer)
      .post('/auth/register')
      .send({ email: 123, password: 'Str0ngPass' })
      .expect(400);

    await request(httpServer)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send('null')
      .expect(400);
  });
});
