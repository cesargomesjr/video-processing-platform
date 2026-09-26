import { Module } from '@nestjs/common';
import type { Auth } from 'firebase-admin/auth';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/load-app-config.js';
import { SqlClient } from '../../platform/database/sql-client.js';
import { IdentityTokenVerifier } from '../../contexts/identity/application/ports/identity-token-verifier.js';
import { UserIdGenerator } from '../../contexts/identity/application/ports/user-id-generator.js';
import { UserRepository } from '../../contexts/identity/application/ports/user-repository.js';
import { AuthenticateUser } from '../../contexts/identity/application/use-cases/authenticate-user.js';
import { ResolveAuthenticatedUser } from '../../contexts/identity/application/use-cases/resolve-authenticated-user.js';
import { createFirebaseAuth } from '../../contexts/identity/infrastructure/firebase/create-firebase-auth.js';
import {
  FirebaseIdentityTokenVerifier,
  type FirebaseAuthClient,
} from '../../contexts/identity/infrastructure/firebase/firebase-identity-token-verifier.js';
import { RandomUserIdGenerator } from '../../contexts/identity/infrastructure/identity/random-user-id-generator.js';
import { PostgresUserRepository } from '../../contexts/identity/infrastructure/persistence/postgres-user-repository.js';
import { AuthController } from '../../contexts/identity/presentation/http/auth.controller.js';
import { AuthenticationGuard } from '../../contexts/identity/presentation/http/authentication.guard.js';

const FIREBASE_AUTH = Symbol('FIREBASE_AUTH');

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: FIREBASE_AUTH,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): Auth =>
        createFirebaseAuth({
          projectId: config.firebaseProjectId,
          useEmulator: config.firebaseAuthEmulatorHost !== null,
        }),
    },
    {
      provide: IdentityTokenVerifier,
      inject: [FIREBASE_AUTH],
      useFactory: (firebaseAuth: FirebaseAuthClient): IdentityTokenVerifier =>
        new FirebaseIdentityTokenVerifier(firebaseAuth),
    },
    {
      provide: UserRepository,
      inject: [SqlClient],
      useFactory: (sqlClient: SqlClient): UserRepository =>
        new PostgresUserRepository(sqlClient),
    },
    {
      provide: UserIdGenerator,
      useClass: RandomUserIdGenerator,
    },
    {
      provide: ResolveAuthenticatedUser,
      inject: [UserRepository, UserIdGenerator],
      useFactory: (
        userRepository: UserRepository,
        userIdGenerator: UserIdGenerator,
      ): ResolveAuthenticatedUser =>
        new ResolveAuthenticatedUser(userRepository, userIdGenerator),
    },
    {
      provide: AuthenticateUser,
      inject: [IdentityTokenVerifier, ResolveAuthenticatedUser],
      useFactory: (
        identityTokenVerifier: IdentityTokenVerifier,
        resolveAuthenticatedUser: ResolveAuthenticatedUser,
      ): AuthenticateUser =>
        new AuthenticateUser(identityTokenVerifier, resolveAuthenticatedUser),
    },
    AuthenticationGuard,
  ],
  exports: [
    AuthenticateUser,
    AuthenticationGuard,
    IdentityTokenVerifier,
    ResolveAuthenticatedUser,
    UserRepository,
  ],
})
export class IdentityModule {}
