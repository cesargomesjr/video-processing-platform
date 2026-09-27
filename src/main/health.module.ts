import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HealthController } from '../platform/health/health.controller';
import { HealthService } from '../platform/health/health.service';
import { DatabaseModule } from './database.module';
import { DATA_SOURCE } from './tokens';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [
    {
      provide: HealthService,
      inject: [DATA_SOURCE],
      useFactory: (dataSource: DataSource): HealthService => new HealthService(dataSource),
    },
  ],
})
export class HealthModule {}
