import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../../src/main/database.module';
import { IdentityModule } from '../../../src/main/identity.module';
import { HealthModule } from '../../../src/main/health.module';
import { MetricsModule } from '../../../src/main/metrics.module';
import { VideoManagementModule } from '../../../src/main/video-management.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [DatabaseModule, IdentityModule, VideoManagementModule, MetricsModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
