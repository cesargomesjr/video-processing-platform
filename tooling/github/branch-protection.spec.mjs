import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildProtectionPolicy,
  PROTECTED_BRANCHES,
  validateRepository,
} from './branch-protection.mjs';

it('protects main, develop, and homol', () => {
  assert.deepEqual(PROTECTED_BRANCHES, ['main', 'develop', 'homol']);
});

describe('GitHub branch protection', () => {
  it('accepts an owner/repository identifier', () => {
    assert.equal(
      validateRepository('fiapx/video-platform'),
      'fiapx/video-platform',
    );
  });

  it('rejects invalid repository identifiers', () => {
    assert.throws(
      () => validateRepository('video-platform'),
      /owner\/repository/,
    );
  });

  it('requires the quality job and pull request approval', () => {
    const policy = buildProtectionPolicy();

    assert.deepEqual(policy.required_status_checks, {
      strict: true,
      contexts: ['quality'],
    });
    assert.equal(
      policy.required_pull_request_reviews.required_approving_review_count,
      1,
    );
    assert.equal(policy.allow_force_pushes, false);
    assert.equal(policy.allow_deletions, false);
  });
});
