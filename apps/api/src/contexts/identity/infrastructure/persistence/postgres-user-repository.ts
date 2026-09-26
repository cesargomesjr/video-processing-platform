import type { SqlClient } from '../../../../platform/database/sql-client.js';
import { UserRepository } from '../../application/ports/user-repository.js';
import { FirebaseUid } from '../../domain/firebase-uid.js';
import { User } from '../../domain/user.js';
import { UserId } from '../../domain/user-id.js';

type UserRow = Readonly<{
  id: string;
  firebase_uid: string;
  email: string | null;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}>;

function isUserRow(value: unknown): value is UserRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'firebase_uid' in value &&
    typeof value.firebase_uid === 'string' &&
    'email' in value &&
    (typeof value.email === 'string' || value.email === null) &&
    'email_verified' in value &&
    typeof value.email_verified === 'boolean' &&
    'created_at' in value &&
    value.created_at instanceof Date &&
    'updated_at' in value &&
    value.updated_at instanceof Date
  );
}

function toDomain(row: unknown): User {
  if (!isUserRow(row)) {
    throw new Error('PostgreSQL returned an invalid user row');
  }

  return User.restore({
    id: UserId.create(row.id),
    firebaseUid: FirebaseUid.create(row.firebase_uid),
    email: row.email,
    emailVerified: row.email_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class PostgresUserRepository extends UserRepository {
  public constructor(private readonly sqlClient: SqlClient) {
    super();
  }

  public override async upsertByFirebaseUid(candidate: User): Promise<User> {
    const result = await this.sqlClient.query(
      `
        INSERT INTO users (
          id,
          firebase_uid,
          email,
          email_verified,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $5)
        ON CONFLICT (firebase_uid)
        DO UPDATE SET
          email = EXCLUDED.email,
          email_verified = EXCLUDED.email_verified,
          updated_at = EXCLUDED.updated_at
        RETURNING
          id,
          firebase_uid,
          email,
          email_verified,
          created_at,
          updated_at
      `,
      [
        candidate.id.toString(),
        candidate.firebaseUid.toString(),
        candidate.email,
        candidate.emailVerified,
        candidate.updatedAt,
      ],
    );

    const row = result.rows[0];

    return toDomain(row);
  }
}
