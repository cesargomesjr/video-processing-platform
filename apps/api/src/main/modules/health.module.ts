import { Module } from '@nestjs/common';
import { SqlClient } from '../../platform/database/sql-client.js';
import { DatabaseReadiness } from '../../platform/health/application/database-readiness.js';
import { GetLiveness } from '../../platform/health/application/get-liveness.js';
import { GetReadiness } from '../../platform/health/application/get-readiness.js';
import { PostgresDatabaseReadiness } from '../../platform/health/infrastructure/postgres-database-readiness.js';
import { HealthController } from '../../platform/health/presentation/health.controller.js';

@Module({
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
      inject: [DatabaseReadiness],
      useFactory: (databaseReadiness: DatabaseReadiness): GetReadiness =>
        new GetReadiness(databaseReadiness),
    },
  ],
})
export class HealthModule {}
