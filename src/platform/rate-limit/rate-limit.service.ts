import { RateLimitExceededError, RateLimiter } from './rate-limiter';

export class RateLimitService {
  public constructor(private readonly limiter: RateLimiter) {}

  public async assertLoginAllowed(ip: string, email: string): Promise<void> {
    const result = await this.limiter.consume(`login:${ip}:${email}`, 5, 60);
    if (!result.allowed) {
      throw new RateLimitExceededError(result.retryAfterSeconds);
    }
  }

  public async assertUploadAllowed(userId: string): Promise<void> {
    const result = await this.limiter.consume(`upload:${userId}`, 10, 60);
    if (!result.allowed) {
      throw new RateLimitExceededError(result.retryAfterSeconds);
    }
  }
}
