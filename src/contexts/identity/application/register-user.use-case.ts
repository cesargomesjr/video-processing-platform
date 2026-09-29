import { Email } from '../domain/email';
import { PlainPassword } from '../domain/plain-password';
import { User } from '../domain/user';
import { EmailAlreadyRegisteredError } from './errors';
import { IdGenerator } from './ports/id-generator';
import { PasswordHasher } from './ports/password-hasher';
import { UserRepository } from './ports/user-repository';

export interface RegisterUserInput {
  email: string;
  password: string;
}

export class RegisterUserUseCase {
  public constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly idGenerator: IdGenerator,
  ) {}

  public async execute(input: RegisterUserInput): Promise<User> {
    const email = Email.create(input.email);
    const password = PlainPassword.create(input.password);

    const existing = await this.userRepository.findByEmail(email);
    if (existing !== null) {
      throw new EmailAlreadyRegisteredError();
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const user = User.register(this.idGenerator.next(), email, passwordHash);
    await this.userRepository.save(user);

    return user;
  }
}
