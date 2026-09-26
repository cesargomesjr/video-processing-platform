export class InvalidIdentityTokenError extends Error {
  public constructor() {
    super('Invalid or expired identity token');
    this.name = 'InvalidIdentityTokenError';
  }
}

export class IdentityProviderUnavailableError extends Error {
  public constructor() {
    super('Identity provider is temporarily unavailable');
    this.name = 'IdentityProviderUnavailableError';
  }
}

export class ResourceNotFoundError extends Error {
  public constructor() {
    super('Resource not found');
    this.name = 'ResourceNotFoundError';
  }
}
