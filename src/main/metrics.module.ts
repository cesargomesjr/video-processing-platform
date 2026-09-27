import { Module } from '@nestjs/common';

import { MetricsController } from '../platform/metrics/metrics.controller';
import { MetricsService } from '../platform/metrics/metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
