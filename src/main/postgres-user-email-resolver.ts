import { DataSource } from 'typeorm';

import { UserEmailResolver } from '../contexts/notification/application/ports/user-email-resolver';
import { UserEntity } from '../contexts/identity/infrastructure/typeorm/user.entity';

export class PostgresUserEmailResolver implements UserEmailResolver {
  public constructor(private readonly dataSource: DataSource) {}

  public async resolve(userId: string): Promise<string> {
    const user = await this.dataSource.getRepository(UserEntity).findOneBy({ id: userId });

    if (user === null) {
      throw new Error(`User not found: ${userId}`);
    }

    return user.email;
  }
}
