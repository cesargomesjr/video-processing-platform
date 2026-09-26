import { execFileSync } from 'node:child_process';
import { isProtectedBranch } from './branch-policy.mjs';

const branch = execFileSync('git', ['branch', '--show-current'], {
  encoding: 'utf8',
}).trim();

if (isProtectedBranch(branch)) {
  console.error(
    `Direct commits to '${branch}' are blocked. Create a feature branch and open a pull request.`,
  );
  process.exitCode = 1;
}
