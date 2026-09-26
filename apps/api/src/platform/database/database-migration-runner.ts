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
  {
    version: '002-create-videos-and-outbox',
    statement: `
      CREATE TABLE IF NOT EXISTS videos (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id),
        original_filename varchar(255) NOT NULL,
        declared_content_type varchar(100) NOT NULL,
        declared_size_bytes bigint NOT NULL CHECK (declared_size_bytes > 0),
        storage_key varchar(512) NOT NULL UNIQUE,
        object_version varchar(255),
        verified_content_type varchar(100),
        verified_size_bytes bigint,
        etag varchar(255),
        status varchar(32) NOT NULL CHECK (status IN (
          'AWAITING_UPLOAD', 'PENDING', 'ANALYZING', 'PROCESSING',
          'AGGREGATING', 'COMPLETED', 'FAILED'
        )),
        progress numeric(5,2) CHECK (progress BETWEEN 0 AND 100),
        upload_expires_at timestamptz NOT NULL,
        uploaded_at timestamptz,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );

      CREATE INDEX IF NOT EXISTS videos_owner_created_id_idx
        ON videos (user_id, created_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS videos_status_created_idx
        ON videos (status, created_at);

      CREATE TABLE IF NOT EXISTS outbox_messages (
        id uuid PRIMARY KEY,
        aggregate_id uuid NOT NULL,
        aggregate_type varchar(100) NOT NULL,
        event_type varchar(100) NOT NULL,
        event_version integer NOT NULL,
        correlation_id uuid NOT NULL,
        payload jsonb NOT NULL,
        attempts integer NOT NULL DEFAULT 0,
        available_at timestamptz NOT NULL,
        locked_until timestamptz,
        published_at timestamptz,
        last_error varchar(255),
        occurred_at timestamptz NOT NULL,
        UNIQUE (aggregate_id, event_type, event_version)
      );

      CREATE INDEX IF NOT EXISTS outbox_pending_idx
        ON outbox_messages (available_at, occurred_at)
        WHERE published_at IS NULL;
    `,
  },
  {
    version: '003-enforce-video-verified-metadata',
    statement: `
      ALTER TABLE videos ADD CONSTRAINT videos_verified_metadata_by_status CHECK (
        (status = 'AWAITING_UPLOAD' AND object_version IS NULL AND etag IS NULL AND verified_content_type IS NULL AND verified_size_bytes IS NULL AND uploaded_at IS NULL)
        OR
        (status <> 'AWAITING_UPLOAD' AND object_version IS NOT NULL AND etag IS NOT NULL AND verified_content_type IS NOT NULL AND verified_size_bytes IS NOT NULL AND uploaded_at IS NOT NULL)
      );
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
