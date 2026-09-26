# Runbook — Desenvolvimento Local

## Dependências

- Node.js 24;
- npm 11;
- Docker e Docker Compose;
- Git.

PostgreSQL entra no EPIC-002. RabbitMQ e MinIO entram no EPIC-003.

## Preparação

```bash
cp .env.example .env
npm ci
```

O lifecycle `prepare` configura automaticamente `.githooks` como o diretório de hooks deste clone. Para reinstalar manualmente:

```bash
npm run hooks:install
```

## Executar via Docker Compose

```bash
npm run compose:up
curl --fail http://localhost:3000/health/live
npm run compose:down
```

Para mudar apenas a porta publicada no host:

```bash
API_HOST_PORT=8080 npm run compose:up
```

## Executar diretamente

```bash
npm run build
npm start
curl --fail http://localhost:3000/health/live
```

## Verificação

```bash
npm run verify
```

Esse comando executa formatação, lint, regras arquiteturais, typecheck, testes, cobertura e build.

## Variáveis

- `NODE_ENV`: `development`, `test` ou `production`;
- `APP_PORT`: porta usada pelo processo Node;
- `API_HOST_PORT`: porta publicada pelo Compose.
