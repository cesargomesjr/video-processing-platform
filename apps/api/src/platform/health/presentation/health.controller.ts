import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { GetLiveness, type Liveness } from '../application/get-liveness.js';
import { GetReadiness, type Readiness } from '../application/get-readiness.js';

@Controller('health')
export class HealthController {
  public constructor(
    private readonly getLiveness: GetLiveness,
    private readonly getReadiness: GetReadiness,
  ) {}

  @Get('live')
  public live(): Liveness {
    return this.getLiveness.execute();
  }

  @Get('ready')
  public async ready(): Promise<Readiness> {
    const readiness = await this.getReadiness.execute();

    if (readiness.status === 'unavailable') {
      throw new ServiceUnavailableException(readiness);
    }

    return readiness;
  }
}
