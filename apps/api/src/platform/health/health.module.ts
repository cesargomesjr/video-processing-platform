import { Module } from '@nestjs/common';
import { GetLiveness } from './application/get-liveness.js';
import { HealthController } from './presentation/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [GetLiveness],
})
export class HealthModule {}
