import {
  SqlClient,
  type SqlQueryResult,
} from '../../../../platform/database/sql-client.js';
import { FirebaseUid } from '../../domain/firebase-uid.js';
import { User } from '../../domain/user.js';
import { UserId } from '../../domain/user-id.js';
import { PostgresUserRepository } from './postgres-user-repository.js';

const now = new Date('2026-09-26T12:00:00.000Z');

function candidate(): User {
  return User.create(
    {
      id: UserId.create('123e4567-e89b-42d3-a456-426614174000'),
      firebaseUid: FirebaseUid.create('firebase-user'),
      email: 'user@example.com',
      emailVerified: true,
    },
    now,
  );
}

class StubSqlClient extends SqlClient {
  public statement = '';
  public parameters: readonly unknown[] = [];
  public rows: readonly unknown[] = [
    {
      id: '123e4567-e89b-42d3-a456-426614174000',
      firebase_uid: 'firebase-user',
      email: 'user@example.com',
      email_verified: true,
      created_at: now,
      updated_at: now,
    },
  ];

  public query(
    statement: string,
    parameters: readonly unknown[] = [],
  ): Promise<SqlQueryResult> {
    this.statement = statement;
    this.parameters = parameters;

    return Promise.resolve({ rows: this.rows });
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}

describe('PostgresUserRepository', () => {
  it('atomically upserts and maps a user', async () => {
    const sqlClient = new StubSqlClient();
    const repository = new PostgresUserRepository(sqlClient);

    const user = await repository.upsertByFirebaseUid(candidate());

    expect(sqlClient.statement).toContain('ON CONFLICT (firebase_uid)');
    expect(sqlClient.parameters).toEqual([
      '123e4567-e89b-42d3-a456-426614174000',
      'firebase-user',
      'user@example.com',
      true,
      now,
    ]);
    expect(user.id.toString()).toBe('123e4567-e89b-42d3-a456-426614174000');
    expect(user.firebaseUid.toString()).toBe('firebase-user');
  });

  it('rejects an invalid database row', async () => {
    const sqlClient = new StubSqlClient();
    sqlClient.rows = [{ id: 'invalid' }];

    await expect(
      new PostgresUserRepository(sqlClient).upsertByFirebaseUid(candidate()),
    ).rejects.toThrow('PostgreSQL returned an invalid user row');
  });
});
