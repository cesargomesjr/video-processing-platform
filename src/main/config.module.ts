import { Module } from '@nestjs/common';

import { AppConfig, loadAppConfig } from '../platform/config/app-config.schema';
import { APP_CONFIG } from '../platform/config/app-config.token';

@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: (): AppConfig => loadAppConfig(),
    },
  ],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
