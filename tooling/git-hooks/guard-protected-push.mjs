import { readFileSync } from 'node:fs';
import { findProtectedPushes } from './branch-policy.mjs';

const protectedPushes = findProtectedPushes(readFileSync(0, 'utf8'));

if (protectedPushes.length > 0) {
  console.error(
    `Direct pushes to ${protectedPushes.join(', ')} are blocked. Push a feature branch and open a pull request.`,
  );
  process.exitCode = 1;
}
