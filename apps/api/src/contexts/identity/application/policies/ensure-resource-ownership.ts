import type { UserId } from '../../domain/user-id.js';
import { ResourceNotFoundError } from '../errors/identity-errors.js';

export function ensureResourceOwnership(
  authenticatedUserId: UserId,
  resourceOwnerId: UserId,
): void {
  if (!authenticatedUserId.equals(resourceOwnerId)) {
    throw new ResourceNotFoundError();
  }
}
