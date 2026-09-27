import { createClient, RedisClientType } from 'redis';

import { RateLimiter, RateLimitResult } from './rate-limiter';

export class RedisRateLimiter implements RateLimiter {
  private readonly client: RedisClientType;

  public constructor(url: string) {
    this.client = createClient({ url });
  }

  public async consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }

    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }

    const ttl = await this.client.ttl(key);
    const allowed = count <= limit;

    return {
      allowed,
      retryAfterSeconds: allowed ? 0 : ttl < 0 ? windowSeconds : ttl,
    };
  }

  public async close(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }
}
