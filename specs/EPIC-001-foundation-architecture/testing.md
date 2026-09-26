# Testing — EPIC-001 — Foundation & Architecture

## Strategy

Novo comportamento segue `RED -> GREEN -> REFACTOR`.

## Unit

- defaults e parsing da configuração;
- rejeição de porta e ambiente inválidos;
- resultado do caso de uso de liveness.

## E2E

- `GET /health/live` retorna HTTP 200;
- body é exatamente `{ "status": "healthy" }`.

## Architecture

Dependency-cruiser bloqueia dependências das camadas internas para as externas.

## Smoke

- imagem OCI constrói;
- container inicia como usuário não root;
- healthcheck alcança `/health/live`.
- Compose constrói a imagem e expõe a liveness localmente.

## Required quality gate

```text
lines      >= 80%
statements >= 80%
functions  >= 80%
branches   >= 80%
```

Testes não dependem de DB, broker, storage, rede pública ou timing arbitrário.
