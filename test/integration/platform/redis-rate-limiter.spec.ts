import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

import { RedisRateLimiter } from '../../../src/platform/rate-limit/redis-rate-limiter';

describe('RedisRateLimiter', () => {
  let container: StartedTestContainer;
  let limiter: RedisRateLimiter;

  beforeAll(async () => {
    container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .start();

    limiter = new RedisRateLimiter(
      `redis://${container.getHost()}:${container.getMappedPort(6379)}`,
    );
  }, 120_000);

  afterAll(async () => {
    if (limiter !== undefined) {
      await limiter.close();
    }

    if (container !== undefined) {
      await container.stop();
    }
  });

  it('limits requests within a fixed window', async () => {
    await expect(limiter.consume('key', 2, 60)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    await expect(limiter.consume('key', 2, 60)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });

    const third = await limiter.consume('key', 2, 60);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });
});
