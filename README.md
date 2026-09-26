# video-processing-platform

Plataforma distribuída de processamento de vídeos, construída com TypeScript, RabbitMQ, FFmpeg, PostgreSQL e armazenamento de objetos para extração escalável de frames e geração de arquivos ZIP.

## Documentação

A especificação da nova arquitetura, decomposta a partir do projeto base (Go/Gin), está em [`docs/`](docs/README.md):

- [`docs/01-analise-projeto-base.md`](docs/01-analise-projeto-base.md) — análise AS-IS, problemas e escolha de linguagem
- [`docs/02-arquitetura-alvo.md`](docs/02-arquitetura-alvo.md) — arquitetura TO-BE, bounded contexts, ADRs
- [`docs/03-especificacao-funcional.md`](docs/03-especificacao-funcional.md) — domínio, casos de uso, contratos, DDL
- [`docs/04-plano-de-implementacao.md`](docs/04-plano-de-implementacao.md) — fases, CI/CD, testes, DoD

## Como rodar

> Status: **Fase 0.1 concluída** — monorepo bootstrap (`api` + `worker`), TypeScript strict,
> ESLint, Prettier e hooks de Git. As próximas fases estão em
> [`docs/04-plano-de-implementacao.md`](docs/04-plano-de-implementacao.md).

```bash
npm install
npm run lint
npm run typecheck
npm run build
```

Serviços:

- `npm run start:api` — sobe a API NestJS em `:3000`
- `npm run start:worker` — executa o worker (bootstrap vazio por enquanto)

### Git hooks

- **Conventional Commits** — `commit-msg` valida a mensagem com `commitlint`.
- **Branch protegida** — `pre-commit` e `pre-push` bloqueiam commits/push diretos em
  `main`, `develop` e `homol`; crie uma feature branch.
- **lint-staged** — `pre-commit` formata e corrige lint nos arquivos staged.

Os hooks são instalados automaticamente pelo `prepare` (`husky`) durante o `npm install`.

## Projeto base

O protótipo original em Go/Gin (arquivo único, processamento síncrono) está preservado em
[`legacy/`](legacy/README.md) como material de apresentação. Ele **não** faz parte da plataforma e
nenhuma linha dele deve ser portada — a análise do que foi aproveitado está em
[`docs/01-analise-projeto-base.md`](docs/01-analise-projeto-base.md).
