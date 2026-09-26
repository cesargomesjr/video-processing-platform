import {
  Controller,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type {
  AuthenticatedPrincipal,
  AuthenticatedRequest,
} from './authenticated-request.js';
import { AuthenticationGuard } from './authentication.guard.js';

type AuthenticatedUserResponse = Readonly<{
  id: string;
  firebaseUid: string;
  email: string | null;
  emailVerified: boolean;
}>;

function principalFrom(request: AuthenticatedRequest): AuthenticatedPrincipal {
  if (request.authenticatedPrincipal === undefined) {
    throw new UnauthorizedException();
  }

  return request.authenticatedPrincipal;
}

@Controller('auth')
export class AuthController {
  @Put('me')
  @UseGuards(AuthenticationGuard)
  public me(@Req() request: AuthenticatedRequest): AuthenticatedUserResponse {
    const principal = principalFrom(request);

    return {
      id: principal.userId.toString(),
      firebaseUid: principal.firebaseUid.toString(),
      email: principal.email,
      emailVerified: principal.emailVerified,
    };
  }
}
