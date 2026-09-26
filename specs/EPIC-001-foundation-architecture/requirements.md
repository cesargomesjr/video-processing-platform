# Requirements — EPIC-001 — Foundation & Architecture

### E1-AR-001 — Clean Architecture

**Statement**

A solução MUST respeitar dependency direction inward.

**Acceptance**

Domain e Application não importam Infrastructure, Presentation ou Main. A regra é verificada automaticamente.

**Evidence**

Architecture lint.

### E1-AR-002 — Bounded contexts

**Statement**

Contexts MUST refletir fronteiras reais e não entidades isoladas.

**Acceptance**

A estrutura-alvo está documentada e nenhum contexto vazio é criado antecipadamente.

**Evidence**

Review da estrutura.

### E1-FR-001 — Liveness

**Statement**

A API MUST expor `GET /health/live`.

**Acceptance**

Uma aplicação inicializada retorna HTTP 200 e `{ "status": "healthy" }`, sem consultar dependências externas.

**Evidence**

E2E.

### E1-NFR-001 — Coverage

**Statement**

Coverage MUST ser >= 80% para lines, statements, functions e branches.

**Acceptance**

O comando de cobertura e a CI falham abaixo de qualquer threshold.

**Evidence**

Jest e CI.

### E1-NFR-002 — Configuration validation

**Statement**

Configuração externa MUST ser validada na borda antes do bootstrap.

**Acceptance**

Valores inválidos de `NODE_ENV` ou `APP_PORT` impedem a inicialização com erro explícito e sem expor secrets.

**Evidence**

Unit tests.

### E1-OPS-001 — Container image

**Statement**

A API MUST possuir uma imagem OCI executável e sem usuário root em runtime.

**Acceptance**

A imagem é construída e seu healthcheck alcança o endpoint de liveness.

**Evidence**

Docker build e smoke test.

### E1-OPS-002 — CI/CD

**Statement**

CI MUST executar format check, lint arquitetural, typecheck, testes, coverage, build e Docker build. Delivery MUST publicar a imagem no GHCR em `main` e tags `v*`.

**Acceptance**

Falhas bloqueiam a pipeline e a publicação usa apenas o `GITHUB_TOKEN` com permissões mínimas.

**Evidence**

GitHub Actions workflows.

### E1-OPS-003 — Local Compose runtime

**Statement**

A API MUST poder ser construída e executada localmente via Docker Compose.

**Acceptance**

`docker compose up --build` inicia a API como usuário não root e `GET /health/live` responde com sucesso.

**Evidence**

Compose config e smoke test.
