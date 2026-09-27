import { AuthenticateUseCase } from '../../../src/contexts/identity/application/authenticate.use-case';
import { InvalidCredentialsError } from '../../../src/contexts/identity/application/errors';
import { Email } from '../../../src/contexts/identity/domain/email';
import { PasswordHash } from '../../../src/contexts/identity/domain/password-hash';
import { User } from '../../../src/contexts/identity/domain/user';
import { FakePasswordHasher } from './fakes/fake-password-hasher';
import { FakeTokenIssuer } from './fakes/fake-token-issuer';
import { InMemoryUserRepository } from './fakes/in-memory-user-repository';

describe('AuthenticateUseCase', () => {
  const email = 'user@example.com';
  const password = 'Str0ngPass';

  let useCase: AuthenticateUseCase;

  beforeEach(async () => {
    const repository = new InMemoryUserRepository();
    useCase = new AuthenticateUseCase(repository, new FakePasswordHasher(), new FakeTokenIssuer());

    const user = User.register(
      'user-1',
      Email.create(email),
      PasswordHash.create('hashed:Str0ngPass'),
    );
    await repository.save(user);
  });

  it('issues a token for valid credentials', async () => {
    await expect(useCase.execute({ email, password })).resolves.toEqual({
      accessToken: 'token-for-user-1',
      expiresIn: '15m',
    });
  });

  it('rejects an unknown email', async () => {
    await expect(useCase.execute({ email: 'missing@example.com', password })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('rejects a wrong password', async () => {
    await expect(useCase.execute({ email, password: 'Wr0ngPass' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('rejects an invalid email format as invalid credentials', async () => {
    await expect(useCase.execute({ email: 'not-an-email', password })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('rejects a weak password as invalid credentials', async () => {
    await expect(useCase.execute({ email, password: 'weak' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });
});
