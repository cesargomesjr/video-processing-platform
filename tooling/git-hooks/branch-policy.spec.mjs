import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findProtectedPushes, isProtectedBranch } from './branch-policy.mjs';

describe('branch policy', () => {
  it('protects main, develop, and homol from direct commits', () => {
    assert.equal(isProtectedBranch('main'), true);
    assert.equal(isProtectedBranch('develop'), true);
    assert.equal(isProtectedBranch('homol'), true);
  });

  it('allows commits on feature branches and detached HEAD', () => {
    assert.equal(isProtectedBranch('feature/epic-001'), false);
    assert.equal(isProtectedBranch(''), false);
  });

  it('finds protected remote refs in pre-push input', () => {
    const input = [
      'refs/heads/feature/x abc refs/heads/feature/x def',
      'refs/heads/main abc refs/heads/main def',
      'refs/heads/develop abc refs/heads/develop def',
      'refs/heads/homol abc refs/heads/homol def',
    ].join('\n');

    assert.deepEqual(findProtectedPushes(input), ['main', 'develop', 'homol']);
  });

  it('ignores tags, deletions and feature branch pushes', () => {
    const input = [
      'refs/tags/v1 abc refs/tags/v1 def',
      '(delete) 000 refs/heads/main def',
      'refs/heads/feature/x abc refs/heads/feature/x def',
    ].join('\n');

    assert.deepEqual(findProtectedPushes(input), []);
  });
});
