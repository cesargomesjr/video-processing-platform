import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const PROTECTED_BRANCHES = ['main', 'develop', 'homol'];

export function validateRepository(repository) {
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) {
    throw new Error('Repository must use the owner/repository format');
  }

  return repository;
}

export function buildProtectionPolicy() {
  return {
    required_status_checks: {
      strict: true,
      contexts: ['quality'],
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      require_last_push_approval: true,
      required_approving_review_count: 1,
    },
    restrictions: null,
    required_linear_history: true,
    allow_force_pushes: false,
    allow_deletions: false,
    block_creations: false,
    required_conversation_resolution: true,
    lock_branch: false,
    allow_fork_syncing: true,
  };
}

function protectBranch(repository, branch) {
  const result = spawnSync(
    'gh',
    [
      'api',
      '--method',
      'PUT',
      '--header',
      'Accept: application/vnd.github+json',
      '--header',
      'X-GitHub-Api-Version: 2022-11-28',
      `repos/${repository}/branches/${branch}/protection`,
      '--input',
      '-',
    ],
    {
      input: JSON.stringify(buildProtectionPolicy()),
      stdio: ['pipe', 'inherit', 'inherit'],
    },
  );

  if (result.error !== undefined) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Could not protect branch '${branch}'`);
  }
}

function main() {
  const repository = validateRepository(
    process.argv[2] ?? process.env.GITHUB_REPOSITORY ?? '',
  );

  for (const branch of PROTECTED_BRANCHES) {
    protectBranch(repository, branch);
  }
}

const executedFile = process.argv[1];

if (
  executedFile !== undefined &&
  import.meta.url === pathToFileURL(executedFile).href
) {
  main();
}
