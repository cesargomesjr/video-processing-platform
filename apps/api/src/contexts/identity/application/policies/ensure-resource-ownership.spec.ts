import { UserId } from '../../domain/user-id.js';
import { ResourceNotFoundError } from '../errors/identity-errors.js';
import { ensureResourceOwnership } from './ensure-resource-ownership.js';

describe('ensureResourceOwnership', () => {
  it('allows the authenticated owner', () => {
    const userId = UserId.create('123e4567-e89b-42d3-a456-426614174000');

    expect(() => {
      ensureResourceOwnership(userId, userId);
    }).not.toThrow();
  });

  it('hides a resource owned by another user', () => {
    const authenticatedUserId = UserId.create(
      '123e4567-e89b-42d3-a456-426614174000',
    );
    const resourceOwnerId = UserId.create(
      '123e4567-e89b-42d3-a456-426614174001',
    );

    expect(() => {
      ensureResourceOwnership(authenticatedUserId, resourceOwnerId);
    }).toThrow(ResourceNotFoundError);
  });
});
