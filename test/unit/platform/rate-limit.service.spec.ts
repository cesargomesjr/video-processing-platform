import { RateLimitService } from '../../../src/platform/rate-limit/rate-limit.service';
import {
  RateLimitExceededError,
  RateLimiter,
  RateLimitResult,
} from '../../../src/platform/rate-limit/rate-limiter';

class FakeRateLimiter implements RateLimiter {
  public result: RateLimitResult = { allowed: true, retryAfterSeconds: 0 };
  public readonly calls: Array<{ key: string; limit: number; windowSeconds: number }> = [];

  public consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    this.calls.push({ key, limit, windowSeconds });
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
    expect(limiter.calls).toEqual([{ key: 'upload:user-1', limit: 10, windowSeconds: 60 }]);
  });

  it('allows login within the IP and email quota', async () => {
    const limiter = new FakeRateLimiter();
    const service = new RateLimitService(limiter);

    await expect(
      service.assertLoginAllowed('127.0.0.1', 'user@example.com'),
    ).resolves.toBeUndefined();
    expect(limiter.calls).toEqual([
      { key: 'login:127.0.0.1:user@example.com', limit: 5, windowSeconds: 60 },
    ]);
  });

  it('rejects uploads above the user quota with the retry delay', async () => {
    const limiter = new FakeRateLimiter();
    limiter.result = { allowed: false, retryAfterSeconds: 42 };
    const service = new RateLimitService(limiter);

    await expect(service.assertUploadAllowed('user-1')).rejects.toMatchObject({
      retryAfterSeconds: 42,
    });
    expect(limiter.calls).toEqual([{ key: 'upload:user-1', limit: 10, windowSeconds: 60 }]);
  });
});
