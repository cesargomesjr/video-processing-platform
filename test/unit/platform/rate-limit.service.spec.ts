import { RateLimitService } from '../../../src/platform/rate-limit/rate-limit.service';
import {
  RateLimitExceededError,
  RateLimiter,
  RateLimitResult,
} from '../../../src/platform/rate-limit/rate-limiter';

class FakeRateLimiter implements RateLimiter {
  public result: RateLimitResult = { allowed: true, retryAfterSeconds: 0 };

  public consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    void key;
    void limit;
    void windowSeconds;
    return Promise.resolve(this.result);
  }
}

describe('RateLimitService', () => {
  it('throws RateLimitExceededError when login is not allowed', async () => {
    const limiter = new FakeRateLimiter();
    limiter.result = { allowed: false, retryAfterSeconds: 42 };
    const service = new RateLimitService(limiter);

    await expect(service.assertLoginAllowed('127.0.0.1', 'user@example.com')).rejects.toThrow(
      RateLimitExceededError,
    );
  });

  it('does not throw when upload is allowed', async () => {
    const limiter = new FakeRateLimiter();
    const service = new RateLimitService(limiter);

    await expect(service.assertUploadAllowed('user-1')).resolves.toBeUndefined();
  });
});
