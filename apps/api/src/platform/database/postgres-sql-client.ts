import type { Pool } from 'pg';
import { SqlClient, type SqlQueryResult } from './sql-client.js';

export class PostgresSqlClient extends SqlClient {
  public constructor(private readonly pool: Pool) {
    super();
  }

  public override async query(
    statement: string,
    parameters: readonly unknown[] = [],
  ): Promise<SqlQueryResult> {
    const result = await this.pool.query(statement, [...parameters]);

    return { rows: result.rows as readonly unknown[] };
  }

  public override async close(): Promise<void> {
    await this.pool.end();
  }
}
