import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  IdentityProviderUnavailableError,
  InvalidIdentityTokenError,
} from '../../application/errors/identity-errors.js';
import { AuthenticateUser } from '../../application/use-cases/authenticate-user.js';
import type { AuthenticatedRequest } from './authenticated-request.js';

function authenticationRequired(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'AUTHENTICATION_REQUIRED',
    message: 'A valid bearer token is required',
  });
}

export function extractBearerToken(
  authorization: string | readonly string[] | undefined,
): string {
  if (typeof authorization !== 'string') {
    throw authenticationRequired();
  }

  const match = /^Bearer ([^\s]+)$/u.exec(authorization);
  const token = match?.[1];

  if (token === undefined) {
    throw authenticationRequired();
  }

  return token;
}

@Injectable()
export class AuthenticationGuard implements CanActivate {
  public constructor(
    @Inject(AuthenticateUser)
    private readonly authenticateUser: AuthenticateUser,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const identityToken = extractBearerToken(request.headers.authorization);

    try {
      const user = await this.authenticateUser.execute(identityToken);

      request.authenticatedPrincipal = {
        userId: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        emailVerified: user.emailVerified,
      };

      return true;
    } catch (error: unknown) {
      if (error instanceof InvalidIdentityTokenError) {
        throw new UnauthorizedException({
          code: 'INVALID_IDENTITY_TOKEN',
          message: error.message,
        });
      }

      if (error instanceof IdentityProviderUnavailableError) {
        throw new ServiceUnavailableException({
          code: 'IDENTITY_PROVIDER_UNAVAILABLE',
          message: error.message,
        });
      }

      throw error;
    }
  }
}
