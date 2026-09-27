import { EmailAlreadyRegisteredError } from '../../../src/contexts/identity/application/errors';
import { RegisterUserUseCase } from '../../../src/contexts/identity/application/register-user.use-case';
import { InvalidEmailError } from '../../../src/contexts/identity/domain/email';
import { WeakPasswordError } from '../../../src/contexts/identity/domain/plain-password';
import { FakePasswordHasher } from './fakes/fake-password-hasher';
import { InMemoryUserRepository } from './fakes/in-memory-user-repository';
import { SequentialIdGenerator } from './fakes/sequential-id-generator';

describe('RegisterUserUseCase', () => {
  let repository: InMemoryUserRepository;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    useCase = new RegisterUserUseCase(
      repository,
      new FakePasswordHasher(),
      new SequentialIdGenerator(),
    );
  });

  it('registers a user with a generated id, normalized email and hashed password', async () => {
    const user = await useCase.execute({ email: 'User@Example.COM', password: 'Str0ngPass' });

    expect(user.id).toBe('id-1');
    expect(user.email.value).toBe('user@example.com');
    expect(user.passwordHash.value).toBe('hashed:Str0ngPass');
    await expect(repository.findByEmail(user.email)).resolves.toEqual(user);
  });

  it('rejects a duplicated email', async () => {
    await useCase.execute({ email: 'user@example.com', password: 'Str0ngPass' });

    await expect(
      useCase.execute({ email: 'USER@example.com', password: '0therPass' }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('rejects an invalid email', async () => {
    await expect(
      useCase.execute({ email: 'not-an-email', password: 'Str0ngPass' }),
    ).rejects.toThrow(InvalidEmailError);
  });

  it('rejects a weak password', async () => {
    await expect(useCase.execute({ email: 'user@example.com', password: 'weak' })).rejects.toThrow(
      WeakPasswordError,
    );
  });
});
