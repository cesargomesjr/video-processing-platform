import { Module } from '@nestjs/common';
import { SqlClient } from '../../platform/database/sql-client.js';
import { DatabaseReadiness } from '../../platform/health/application/database-readiness.js';
import { GetLiveness } from '../../platform/health/application/get-liveness.js';
import { GetReadiness } from '../../platform/health/application/get-readiness.js';
import {
  MessageBrokerReadiness,
  ObjectStorageReadiness,
} from '../../platform/health/application/service-readiness.js';
import { PostgresDatabaseReadiness } from '../../platform/health/infrastructure/postgres-database-readiness.js';
import { HealthController } from '../../platform/health/presentation/health.controller.js';
import { VideoManagementModule } from './video-management.module.js';

@Module({
  imports: [VideoManagementModule],
  controllers: [HealthController],
  providers: [
    GetLiveness,
    {
      provide: DatabaseReadiness,
      inject: [SqlClient],
      useFactory: (sqlClient: SqlClient): DatabaseReadiness =>
        new PostgresDatabaseReadiness(sqlClient),
    },
    {
      provide: GetReadiness,
      inject: [
        DatabaseReadiness,
        ObjectStorageReadiness,
        MessageBrokerReadiness,
      ],
      useFactory: (
        database: DatabaseReadiness,
        storage: ObjectStorageReadiness,
        broker: MessageBrokerReadiness,
      ): GetReadiness => new GetReadiness(database, storage, broker),
    },
  ],
})
export class HealthModule {}
