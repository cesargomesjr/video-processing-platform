import { DataSource, Repository } from 'typeorm';

import { UserRepository } from '../../application/ports/user-repository';
import { Email } from '../../domain/email';
import { PasswordHash } from '../../domain/password-hash';
import { User } from '../../domain/user';
import { UserEntity } from './user.entity';

export class PostgresUserRepository implements UserRepository {
  private readonly repository: Repository<UserEntity>;

  public constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(UserEntity);
  }

  public async findByEmail(email: Email): Promise<User | null> {
    const entity = await this.repository.findOneBy({ email: email.value });

    if (entity === null) {
      return null;
    }

    return User.reconstitute(
      entity.id,
      Email.create(entity.email),
      PasswordHash.create(entity.passwordHash),
    );
  }

  public async save(user: User): Promise<void> {
    const entity = this.repository.create({
      id: user.id,
      email: user.email.value,
      passwordHash: user.passwordHash.value,
    });

    await this.repository.save(entity);
  }
}
