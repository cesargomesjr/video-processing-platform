import { Module } from '@nestjs/common';
import { IdentityModule } from './modules/identity.module.js';
import { DatabaseModule } from './modules/database.module.js';
import { HealthModule } from './modules/health.module.js';
import { ConfigModule } from './config/config.module.js';

@Module({
  imports: [ConfigModule, DatabaseModule, HealthModule, IdentityModule],
})
export class AppModule {}
