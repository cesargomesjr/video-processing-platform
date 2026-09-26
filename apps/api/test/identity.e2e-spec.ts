import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  IdentityProviderUnavailableError,
  InvalidIdentityTokenError,
} from '../src/contexts/identity/application/errors/identity-errors.js';
import {
  IdentityTokenVerifier,
  type VerifiedIdentity,
} from '../src/contexts/identity/application/ports/identity-token-verifier.js';
import { UserRepository } from '../src/contexts/identity/application/ports/user-repository.js';
import type { User } from '../src/contexts/identity/domain/user.js';
import { AppModule } from '../src/main/app.module.js';

class StubIdentityTokenVerifier extends IdentityTokenVerifier {
  public error: Error | null = null;

  public verify(identityToken: string): Promise<VerifiedIdentity> {
    if (this.error !== null) {
      return Promise.reject(this.error);
    }

    if (identityToken !== 'valid-token') {
      return Promise.reject(new InvalidIdentityTokenError());
    }

    return Promise.resolve({
      subject: 'firebase-user',
      email: 'user@example.com',
      emailVerified: true,
    });
  }
}

class InMemoryUserRepository extends UserRepository {
  private readonly users = new Map<string, User>();

  public upsertByFirebaseUid(candidate: User): Promise<User> {
    const firebaseUid = candidate.firebaseUid.toString();
    const existing = this.users.get(firebaseUid);

    if (existing !== undefined) {
      return Promise.resolve(existing);
    }

    this.users.set(firebaseUid, candidate);
    return Promise.resolve(candidate);
  }
}

describe('Identity (e2e)', () => {
  let application: INestApplication;
  function responseId(body: unknown): string {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('id' in body) ||
      typeof body.id !== 'string'
    ) {
      throw new Error('Expected response body to contain a string id');
    }

    return body.id;
  }

  let tokenVerifier: StubIdentityTokenVerifier;

  beforeEach(async () => {
    tokenVerifier = new StubIdentityTokenVerifier();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IdentityTokenVerifier)
      .useValue(tokenVerifier)
      .overrideProvider(UserRepository)
      .useValue(new InMemoryUserRepository())
      .compile();

    application = moduleRef.createNestApplication();
    await application.listen(0);
  });

  afterEach(async () => {
    await application.close();
  });

  it('PUT /auth/me provisions and returns the authenticated user', async () => {
    const response = await request(await application.getUrl())
      .put('/auth/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body).toMatchObject({
      firebaseUid: 'firebase-user',
      email: 'user@example.com',
      emailVerified: true,
    });
    expect(responseId(response.body as unknown)).toMatch(/^[0-9a-f-]{36}$/u);
  });

  it('keeps the same local ID on repeated provisioning', async () => {
    const agent = request(await application.getUrl());
    const first = await agent
      .put('/auth/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
    const second = await agent
      .put('/auth/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(responseId(second.body as unknown)).toBe(
      responseId(first.body as unknown),
    );
  });

  it('rejects a missing bearer token', async () => {
    const response = await request(await application.getUrl())
      .put('/auth/me')
      .expect(401);

    expect(response.body).toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('rejects an invalid identity token', async () => {
    const response = await request(await application.getUrl())
      .put('/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body).toMatchObject({
      code: 'INVALID_IDENTITY_TOKEN',
    });
  });

  it('maps identity provider failures to service unavailable', async () => {
    tokenVerifier.error = new IdentityProviderUnavailableError();

    const response = await request(await application.getUrl())
      .put('/auth/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(503);

    expect(response.body).toMatchObject({
      code: 'IDENTITY_PROVIDER_UNAVAILABLE',
    });
  });
});
