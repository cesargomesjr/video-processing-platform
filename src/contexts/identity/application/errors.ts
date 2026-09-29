import { DomainError } from '../domain/domain-error';

export class EmailAlreadyRegisteredError extends DomainError {
  public constructor() {
    super('Email is already registered');
  }
}

export class InvalidCredentialsError extends DomainError {
  public constructor() {
    super('Invalid credentials');
  }
}
