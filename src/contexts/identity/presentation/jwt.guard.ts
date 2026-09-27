import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtPayload, verify } from 'jsonwebtoken';

import { AppConfig } from '../../../platform/config/app-config.schema';
import { APP_CONFIG } from '../../../platform/config/app-config.token';

interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: { id: string };
}

@Injectable()
export class JwtGuard implements CanActivate {
  public constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (authorization === undefined || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authorization.slice('Bearer '.length);

    try {
      const payload = verify(token, this.config.jwt.secret) as JwtPayload;
      if (typeof payload.sub !== 'string') {
        throw new UnauthorizedException();
      }

      request.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
