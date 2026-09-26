#!/usr/bin/env sh
set -eu

mode="${1:-commit}"
protected="main develop homol"

current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"

is_protected() {
  branch="$1"
  for protected_branch in $protected; do
    if [ "$branch" = "$protected_branch" ]; then
      return 0
    fi
  done
  return 1
}

if [ "$mode" = "commit" ]; then
  if is_protected "$current_branch"; then
    printf '✖ Commit direto em "%s" não é permitido.\n' "$current_branch" >&2
    printf '  Crie uma feature branch e abra um pull request.\n' >&2
    exit 1
  fi
elif [ "$mode" = "push" ]; then
  while read -r _local_ref _local_sha remote_ref _remote_sha; do
    remote_branch="${remote_ref##*/}"
    if is_protected "$remote_branch"; then
      printf '✖ Push direto para "%s" não é permitido.\n' "$remote_branch" >&2
      printf '  Abra um pull request.\n' >&2
      exit 1
    fi
  done
else
  printf 'Modo inválido: %s (use commit|push)\n' "$mode" >&2
  exit 1
fi

exit 0
