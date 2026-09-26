const PROTECTED_BRANCHES = new Set(['main', 'develop', 'homol']);

export function isProtectedBranch(branch) {
  return PROTECTED_BRANCHES.has(branch);
}

export function findProtectedPushes(input) {
  const protectedPushes = new Set();

  for (const line of input.split('\n')) {
    const [localRef, localSha, remoteRef] = line.trim().split(/\s+/);

    if (
      localRef === undefined ||
      localSha === undefined ||
      remoteRef === undefined ||
      localRef === '(delete)' ||
      /^0+$/.test(localSha)
    ) {
      continue;
    }

    const branch = remoteRef.startsWith('refs/heads/')
      ? remoteRef.slice('refs/heads/'.length)
      : '';

    if (isProtectedBranch(branch)) {
      protectedPushes.add(branch);
    }
  }

  return [...protectedPushes];
}
