import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { UserEntity } from '../contexts/identity/infrastructure/typeorm/user.entity';
import { AppConfig } from '../platform/config/app-config.schema';
import { APP_CONFIG } from '../platform/config/app-config.token';
import { ConfigModule } from './config.module';
import { DATA_SOURCE } from './tokens';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATA_SOURCE,
      inject: [APP_CONFIG],
      useFactory: async (config: AppConfig): Promise<DataSource> => {
        const dataSource = new DataSource({
          type: 'postgres',
          url: config.databaseUrl,
          entities: [UserEntity],
          synchronize: config.nodeEnv !== 'production',
        });

        await dataSource.initialize();
        return dataSource;
      },
    },
  ],
  exports: [DATA_SOURCE],
})
export class DatabaseModule {}
