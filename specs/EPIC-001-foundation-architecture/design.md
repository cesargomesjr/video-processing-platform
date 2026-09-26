# Design — EPIC-001 — Foundation & Architecture

## Architecture impact

```text
apps/api/src/
├── contexts/
│   └── <context>/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── presentation/
├── platform/
└── main/
```

`contexts/` é uma estrutura-alvo: nenhum diretório de contexto é criado antes de existir comportamento. Capacidades técnicas compartilhadas e não pertencentes a um contexto ficam em `platform`; bootstrap, configuração e composição ficam em `main`.

## Components

- API shell;
- config parser na borda;
- liveness application service;
- health HTTP controller;
- architecture rules;
- container image;
- CI e delivery workflows.

## Dependency rules

- Domain não conhece Application nem camadas externas;
- Application conhece Domain e define ports quando existir consumidor;
- Infrastructure implementa ports de Application/Domain;
- Presentation traduz transportes e chama Application;
- Main compõe dependências;
- contexts não acessam internals de outros contexts.

## Health contract

`GET /health/live` retorna HTTP 200 e `{ "status": "healthy" }`. Não consulta providers. Readiness será introduzida junto às dependências externas nos próximos épicos.

## Configuration

- `NODE_ENV`: `development`, `test` ou `production`; default `development`;
- `APP_PORT`: inteiro entre 1 e 65535; default `3000`;
- valores externos são tratados como `unknown`/strings não confiáveis na borda;
- Domain e Application não acessam `process.env`.

## Testing

- unit: configuração e liveness;
- E2E: contrato HTTP de liveness;
- architecture: imports proibidos;
- smoke: imagem e healthcheck.

## Security

- runtime da imagem executa como usuário não root;
- nenhum secret é requerido neste épico;
- workflows usam permissões mínimas;
- `.env` é ignorado e somente `.env.example` é versionado.

## Deferred decisions

- PostgreSQL e readiness de banco: EPIC-002;
- RabbitMQ, MinIO e respectivas readiness checks: EPIC-003;
- logs estruturados, OpenTelemetry, Prometheus e Grafana: EPIC-007.
