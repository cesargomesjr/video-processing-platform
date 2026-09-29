import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  public constructor(private readonly health: HealthService) {}

  @Get('live')
  public live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  public async ready(): Promise<{ status: string }> {
    if (!(await this.health.isReady())) {
      throw new ServiceUnavailableException('Not ready');
    }

    return { status: 'ready' };
  }
}
