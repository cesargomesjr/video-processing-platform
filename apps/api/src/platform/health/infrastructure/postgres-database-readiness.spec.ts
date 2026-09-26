import { SqlClient, type SqlQueryResult } from '../../database/sql-client.js';
import { PostgresDatabaseReadiness } from './postgres-database-readiness.js';

class StubSqlClient extends SqlClient {
  public error: Error | null = null;

  public query(): Promise<SqlQueryResult> {
    if (this.error !== null) {
      throw this.error;
    }

    return Promise.resolve({ rows: [{ '?column?': 1 }] });
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}

describe('PostgresDatabaseReadiness', () => {
  it('is ready when SELECT 1 succeeds', async () => {
    const sqlClient = new StubSqlClient();

    await expect(
      new PostgresDatabaseReadiness(sqlClient).isReady(),
    ).resolves.toBe(true);
  });

  it('is unavailable when PostgreSQL fails', async () => {
    const sqlClient = new StubSqlClient();
    sqlClient.error = new Error('connection refused');

    await expect(
      new PostgresDatabaseReadiness(sqlClient).isReady(),
    ).resolves.toBe(false);
  });
});
