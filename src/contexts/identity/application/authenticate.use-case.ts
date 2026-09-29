import { Email, InvalidEmailError } from '../domain/email';
import { PlainPassword, WeakPasswordError } from '../domain/plain-password';
import { InvalidCredentialsError } from './errors';
import { IssuedToken, TokenIssuer } from './ports/token-issuer';
import { PasswordHasher } from './ports/password-hasher';
import { UserRepository } from './ports/user-repository';

export interface AuthenticateInput {
  email: string;
  password: string;
}

export class AuthenticateUseCase {
  public constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenIssuer: TokenIssuer,
  ) {}

  public async execute(input: AuthenticateInput): Promise<IssuedToken> {
    const email = this.parseEmail(input.email);
    const password = this.parsePassword(input.password);

    const user = await this.userRepository.findByEmail(email);
    if (user === null) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(password, user.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    return this.tokenIssuer.issue(user.id);
  }

  private parseEmail(raw: string): Email {
    try {
      return Email.create(raw);
    } catch (error) {
      if (error instanceof InvalidEmailError) {
        throw new InvalidCredentialsError();
      }
      throw error;
    }
  }

  private parsePassword(raw: string): PlainPassword {
    try {
      return PlainPassword.create(raw);
    } catch (error) {
      if (error instanceof WeakPasswordError) {
        throw new InvalidCredentialsError();
      }
      throw error;
    }
  }
}
