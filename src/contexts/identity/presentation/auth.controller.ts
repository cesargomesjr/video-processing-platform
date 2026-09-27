import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthenticateUseCase } from '../application/authenticate.use-case';
import { EmailAlreadyRegisteredError, InvalidCredentialsError } from '../application/errors';
import { RegisterUserUseCase } from '../application/register-user.use-case';
import { InvalidEmailError } from '../domain/email';
import { WeakPasswordError } from '../domain/plain-password';
import { RateLimitExceededError } from '../../../platform/rate-limit/rate-limiter';
import { RateLimitService } from '../../../platform/rate-limit/rate-limit.service';
import { JwtGuard } from './jwt.guard';

interface AuthInput {
  email: string;
  password: string;
}

interface AuthenticatedRequest {
  user: { id: string };
}

@Controller('auth')
export class AuthController {
  public constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly authenticate: AuthenticateUseCase,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  public async register(@Body() body: unknown): Promise<{ id: string; email: string }> {
    const input = this.parseAuthInput(body);

    try {
      const user = await this.registerUser.execute(input);
      return { id: user.id, email: user.email.value };
    } catch (error: unknown) {
      this.toHttpError(error);
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  public async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string; expiresIn: string }> {
    const input = this.parseAuthInput(body);

    try {
      await this.rateLimitService.assertLoginAllowed(request.ip ?? 'unknown', input.email);
    } catch (error: unknown) {
      if (error instanceof RateLimitExceededError) {
        response.setHeader('Retry-After', String(error.retryAfterSeconds));
        throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
      }

      throw error;
    }

    try {
      return await this.authenticate.execute(input);
    } catch (error: unknown) {
      this.toHttpError(error);
    }
  }

  @Get('me')
  @UseGuards(JwtGuard)
  public me(@Req() request: AuthenticatedRequest): { id: string } {
    return { id: request.user.id };
  }

  private parseAuthInput(body: unknown): AuthInput {
    if (typeof body !== 'object' || body === null) {
      throw new BadRequestException('Invalid request body');
    }

    const { email, password } = body as { email?: unknown; password?: unknown };

    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new BadRequestException('email and password are required');
    }

    return { email, password };
  }

  private toHttpError(error: unknown): never {
    if (error instanceof EmailAlreadyRegisteredError) {
      throw new ConflictException(error.message);
    }

    if (error instanceof InvalidCredentialsError) {
      throw new UnauthorizedException(error.message);
    }

    if (error instanceof InvalidEmailError || error instanceof WeakPasswordError) {
      throw new BadRequestException(error.message);
    }

    throw new InternalServerErrorException();
  }
}
