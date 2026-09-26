import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { Pool } from 'pg';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/load-app-config.js';
import { DatabaseMigrationRunner } from '../../platform/database/database-migration-runner.js';
import { PostgresSqlClient } from '../../platform/database/postgres-sql-client.js';
import { SqlClient } from '../../platform/database/sql-client.js';

class DatabaseLifecycle implements OnApplicationShutdown {
  public constructor(
    @Inject(SqlClient) private readonly sqlClient: SqlClient,
  ) {}

  public async onApplicationShutdown(): Promise<void> {
    await this.sqlClient.close();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: Pool,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): Pool =>
        new Pool({
          connectionString: config.databaseUrl,
          max: config.databasePoolMax,
        }),
    },
    {
      provide: SqlClient,
      inject: [Pool],
      useFactory: (pool: Pool): SqlClient => new PostgresSqlClient(pool),
    },
    {
      provide: DatabaseMigrationRunner,
      inject: [SqlClient],
      useFactory: (sqlClient: SqlClient): DatabaseMigrationRunner =>
        new DatabaseMigrationRunner(sqlClient),
    },
    DatabaseLifecycle,
  ],
  exports: [DatabaseMigrationRunner, Pool, SqlClient],
})
export class DatabaseModule {}
