import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

import { Email } from '../../../src/contexts/identity/domain/email';
import { PasswordHash } from '../../../src/contexts/identity/domain/password-hash';
import { User } from '../../../src/contexts/identity/domain/user';
import { PostgresUserRepository } from '../../../src/contexts/identity/infrastructure/typeorm/postgres-user.repository';
import { UserEntity } from '../../../src/contexts/identity/infrastructure/typeorm/user.entity';

describe('PostgresUserRepository', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      entities: [UserEntity],
      synchronize: true,
    });

    await dataSource.initialize();
    repository = new PostgresUserRepository(dataSource);
  }, 120_000);

  afterAll(async () => {
    if (dataSource !== undefined && dataSource.isInitialized) {
      await dataSource.destroy();
    }

    if (container !== undefined) {
      await container.stop();
    }
  });

  it('saves and finds a user by normalized email', async () => {
    const user = User.register(
      '11111111-1111-1111-1111-111111111111',
      Email.create('User@Example.com'),
      PasswordHash.create('$2b$10$hash'),
    );

    await repository.save(user);

    const found = await repository.findByEmail(Email.create('user@example.com'));

    expect(found).not.toBeNull();
    expect(found?.id).toBe('11111111-1111-1111-1111-111111111111');
    expect(found?.email.value).toBe('user@example.com');
    expect(found?.passwordHash.value).toBe('$2b$10$hash');
  });

  it('returns null when the email does not exist', async () => {
    await expect(repository.findByEmail(Email.create('missing@example.com'))).resolves.toBeNull();
  });

  it('rejects duplicate emails', async () => {
    const email = Email.create('dup@example.com');
    const first = User.register(
      '22222222-2222-2222-2222-222222222222',
      email,
      PasswordHash.create('$2b$10$first'),
    );
    const second = User.register(
      '33333333-3333-3333-3333-333333333333',
      email,
      PasswordHash.create('$2b$10$second'),
    );

    await repository.save(first);

    await expect(repository.save(second)).rejects.toThrow();
  });
});
