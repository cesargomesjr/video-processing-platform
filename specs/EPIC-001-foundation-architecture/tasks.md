# Tasks — EPIC-001 — Foundation & Architecture

## E1-TASK-001 — Initialize workspace

Configure npm workspace, Node.js 24, TypeScript strict/NodeNext, NestJS and verification scripts.

**Evidence:** lockfile, build and typecheck.

## E1-TASK-002 — Establish target structure

Document `apps/api/src/contexts/<context>/{domain,application,infrastructure,presentation}`, `platform` and `main`, without empty contexts.

**Evidence:** repository structure review.

## E1-TASK-003 — Package API image

Create a multi-stage Dockerfile with non-root runtime and liveness healthcheck.

**Evidence:** Docker build and container smoke.

## E1-TASK-004 — Validate configuration

Parse and validate `NODE_ENV` and `APP_PORT` at the composition boundary.

**Evidence:** unit tests for defaults, valid values and invalid branches.

## E1-TASK-005 — Implement liveness

Implement the application flow and `GET /health/live` contract.

**Evidence:** unit and E2E tests.

## E1-TASK-006 — Implement CI/CD

Create CI quality gates and publish the API image to GHCR from `main` and version tags.

**Evidence:** GitHub Actions workflow validation/execution.

## E1-TASK-007 — Enforce coverage

Configure Jest global thresholds at 80% for lines, statements, functions and branches.

**Evidence:** `npm run test:cov`.

## E1-TASK-008 — Enforce architecture

Block imports from inner layers to outer layers through dependency-cruiser.

**Evidence:** `npm run architecture`.

## E1-TASK-009 — Compose local API

Criar `compose.yml` seguro para build, execução e healthcheck da API sem dependências externas.

**Evidence:** `docker compose config` e smoke test.

## Done for every task

- strict typecheck passes;
- relevant automated tests pass;
- architecture boundaries remain enforced;
- affected documentation and traceability are updated.
