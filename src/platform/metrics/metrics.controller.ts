import { Controller, Get } from '@nestjs/common';

import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  public constructor(private readonly metrics: MetricsService) {}

  @Get()
  public render(): string {
    return this.metrics.render();
  }
}
