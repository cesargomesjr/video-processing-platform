# Git Workflow and Branch Protection

## Working branches

Commits e pushes diretos para `main`, `develop` e `homol` são bloqueados pelos hooks locais. Crie uma branch de trabalho:

```bash
git switch -c feature/<descricao>
```

## Conventional Commits

O hook `commit-msg` usa commitlint. Exemplos válidos:

```text
feat(api): add video endpoint
fix(processing): handle duplicated message
docs: update local runbook
```

## Hooks

- `pre-commit`: bloqueia `main`/`develop`/`homol` e executa lint, typecheck e testes;
- `commit-msg`: valida Conventional Commits;
- `pre-push`: bloqueia pushes diretos para `main`/`develop`/`homol`.

Hooks locais podem ser ignorados com `--no-verify`, portanto não substituem proteção remota.

## GitHub branch protection

Após criar `main`, `develop` e `homol` no remoto e autenticar o GitHub CLI com uma conta administradora:

```bash
npm run branches:protect -- owner/repository
```

O script exige pull request, um approval, conversas resolvidas, histórico linear e o status check `quality`; também bloqueia force push e exclusão das três branches.
