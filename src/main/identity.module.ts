import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AuthenticateUseCase } from '../contexts/identity/application/authenticate.use-case';
import { RegisterUserUseCase } from '../contexts/identity/application/register-user.use-case';
import { BcryptPasswordHasher } from '../contexts/identity/infrastructure/bcrypt-password-hasher';
import { JwtTokenIssuer } from '../contexts/identity/infrastructure/jwt-token-issuer';
import { PostgresUserRepository } from '../contexts/identity/infrastructure/typeorm/postgres-user.repository';
import { UuidIdGenerator } from '../contexts/identity/infrastructure/uuid-id-generator';
import { AuthController } from '../contexts/identity/presentation/auth.controller';
import { JwtGuard } from '../contexts/identity/presentation/jwt.guard';
import { AppConfig } from '../platform/config/app-config.schema';
import { APP_CONFIG } from '../platform/config/app-config.token';
import { ConfigModule } from './config.module';
import { DatabaseModule } from './database.module';
import {
  DATA_SOURCE,
  ID_GENERATOR,
  PASSWORD_HASHER,
  TOKEN_ISSUER,
  USER_REPOSITORY,
} from './tokens';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [AuthController],
  providers: [
    JwtGuard,
    {
      provide: USER_REPOSITORY,
      inject: [DATA_SOURCE],
      useFactory: (dataSource: DataSource): PostgresUserRepository =>
        new PostgresUserRepository(dataSource),
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: TOKEN_ISSUER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): JwtTokenIssuer =>
        new JwtTokenIssuer({ secret: config.jwt.secret, expiresIn: config.jwt.expiresIn }),
    },
    {
      provide: ID_GENERATOR,
      useClass: UuidIdGenerator,
    },
    {
      provide: RegisterUserUseCase,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, ID_GENERATOR],
      useFactory: (
        userRepository: PostgresUserRepository,
        passwordHasher: BcryptPasswordHasher,
        idGenerator: UuidIdGenerator,
      ): RegisterUserUseCase =>
        new RegisterUserUseCase(userRepository, passwordHasher, idGenerator),
    },
    {
      provide: AuthenticateUseCase,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_ISSUER],
      useFactory: (
        userRepository: PostgresUserRepository,
        passwordHasher: BcryptPasswordHasher,
        tokenIssuer: JwtTokenIssuer,
      ): AuthenticateUseCase =>
        new AuthenticateUseCase(userRepository, passwordHasher, tokenIssuer),
    },
  ],
  exports: [JwtGuard],
})
export class IdentityModule {}
