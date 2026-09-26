import type { FirebaseUid } from '../../domain/firebase-uid.js';
import type { UserId } from '../../domain/user-id.js';

export type AuthenticatedPrincipal = Readonly<{
  userId: UserId;
  firebaseUid: FirebaseUid;
  email: string | null;
  emailVerified: boolean;
}>;

export interface AuthenticatedRequest {
  headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  authenticatedPrincipal?: AuthenticatedPrincipal;
}
