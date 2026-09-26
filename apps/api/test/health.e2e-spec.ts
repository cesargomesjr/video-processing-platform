import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/main/app.module.js';

describe('Health (e2e)', () => {
  let application: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    application = moduleRef.createNestApplication();
    await application.listen(0);
  });

  afterEach(async () => {
    await application.close();
  });

  it('GET /health/live reports a healthy process', async () => {
    await request(await application.getUrl())
      .get('/health/live')
      .expect(200)
      .expect({ status: 'healthy' });
  });
});
