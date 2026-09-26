import { Module } from '@nestjs/common';
import { IdentityModule } from './modules/identity.module.js';
import { DatabaseModule } from './modules/database.module.js';
import { HealthModule } from './modules/health.module.js';
import { VideoManagementModule } from './modules/video-management.module.js';
import { ConfigModule } from './config/config.module.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    IdentityModule,
    VideoManagementModule,
    HealthModule,
  ],
})
export class AppModule {}
