import { DatabaseMigrationRunner } from './database-migration-runner.js';
import { SqlClient, type SqlQueryResult } from './sql-client.js';

class RecordingSqlClient extends SqlClient {
  public readonly statements: string[] = [];
  public readonly parameters: (readonly unknown[] | undefined)[] = [];
  public appliedRows: readonly unknown[] = [];
  public failOnCreateUsers = false;

  public query(
    statement: string,
    parameters?: readonly unknown[],
  ): Promise<SqlQueryResult> {
    this.statements.push(statement.trim());
    this.parameters.push(parameters);

    if (
      this.failOnCreateUsers &&
      statement.includes('CREATE TABLE IF NOT EXISTS users')
    ) {
      throw new Error('migration failure');
    }

    if (statement.includes('SELECT version')) {
      return Promise.resolve({ rows: this.appliedRows });
    }

    return Promise.resolve({ rows: [] });
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}

describe('DatabaseMigrationRunner', () => {
  it('applies pending migrations in a transaction', async () => {
    const sqlClient = new RecordingSqlClient();
    const runner = new DatabaseMigrationRunner(sqlClient);

    await runner.run();

    expect(sqlClient.statements[0]).toBe('BEGIN');
    expect(
      sqlClient.statements.some((statement) =>
        statement.includes('CREATE TABLE IF NOT EXISTS users'),
      ),
    ).toBe(true);
    expect(sqlClient.parameters).toContainEqual(['001-create-users']);
    expect(sqlClient.statements.at(-1)).toBe('COMMIT');
  });

  it('skips an already applied migration', async () => {
    const sqlClient = new RecordingSqlClient();
    sqlClient.appliedRows = [{ version: '001-create-users' }];

    await new DatabaseMigrationRunner(sqlClient).run();

    expect(
      sqlClient.statements.some((statement) =>
        statement.includes('CREATE TABLE IF NOT EXISTS users'),
      ),
    ).toBe(false);
  });

  it('rolls back and rethrows a failed migration', async () => {
    const sqlClient = new RecordingSqlClient();
    sqlClient.failOnCreateUsers = true;

    await expect(new DatabaseMigrationRunner(sqlClient).run()).rejects.toThrow(
      'migration failure',
    );
    expect(sqlClient.statements.at(-1)).toBe('ROLLBACK');
  });
});
