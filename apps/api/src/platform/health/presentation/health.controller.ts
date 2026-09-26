import { Controller, Get } from '@nestjs/common';
import { GetLiveness, type Liveness } from '../application/get-liveness.js';

@Controller('health')
export class HealthController {
  public constructor(private readonly getLiveness: GetLiveness) {}

  @Get('live')
  public live(): Liveness {
    return this.getLiveness.execute();
  }
}
