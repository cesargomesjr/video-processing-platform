import { Module } from '@nestjs/common';

import { AppConfig } from '../platform/config/app-config.schema';
import { APP_CONFIG } from '../platform/config/app-config.token';
import { RateLimitService } from '../platform/rate-limit/rate-limit.service';
import { RedisRateLimiter } from '../platform/rate-limit/redis-rate-limiter';
import { ConfigModule } from './config.module';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RateLimitService,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): RateLimitService =>
        new RateLimitService(new RedisRateLimiter(config.redisUrl)),
    },
  ],
  exports: [RateLimitService],
})
export class RateLimitModule {}
