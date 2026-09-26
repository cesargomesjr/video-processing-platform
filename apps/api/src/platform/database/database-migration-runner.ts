import type { SqlClient } from './sql-client.js';

type Migration = Readonly<{
  version: string;
  statement: string;
}>;

const MIGRATIONS: readonly Migration[] = [
  {
    version: '001-create-users',
    statement: `
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY,
        firebase_uid varchar(128) NOT NULL UNIQUE,
        email varchar(320),
        email_verified boolean NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
        ON users (lower(email))
        WHERE email IS NOT NULL;
    `,
  },
];

function readAppliedVersions(rows: readonly unknown[]): Set<string> {
  const versions = new Set<string>();

  for (const row of rows) {
    if (
      typeof row === 'object' &&
      row !== null &&
      'version' in row &&
      typeof row.version === 'string'
    ) {
      versions.add(row.version);
    }
  }

  return versions;
}

export class DatabaseMigrationRunner {
  public constructor(private readonly sqlClient: SqlClient) {}

  public async run(): Promise<void> {
    await this.sqlClient.query('BEGIN');

    try {
      await this.sqlClient.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version varchar(100) PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      const result = await this.sqlClient.query(
        'SELECT version FROM schema_migrations',
      );
      const appliedVersions = readAppliedVersions(result.rows);

      for (const migration of MIGRATIONS) {
        if (!appliedVersions.has(migration.version)) {
          await this.sqlClient.query(migration.statement);
          await this.sqlClient.query(
            'INSERT INTO schema_migrations (version) VALUES ($1)',
            [migration.version],
          );
        }
      }

      await this.sqlClient.query('COMMIT');
    } catch (error: unknown) {
      await this.sqlClient.query('ROLLBACK');
      throw error;
    }
  }
}
