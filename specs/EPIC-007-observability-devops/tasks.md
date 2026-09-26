# Tasks — EPIC-007 — Observability & DevOps

As tarefas abaixo são unidades técnicas de execução. Não representam novos requisitos.

## E7-TASK-001 — Structured logger

**Goal**

Padronizar campos.

**Implementation area**

`platform/observability`

**Tests**

integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E7-TASK-002 — Prometheus metrics

**Goal**

Adicionar métricas críticas.

**Implementation area**

`platform/observability`

**Tests**

smoke

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E7-TASK-003 — Tracing propagation

**Goal**

Propagar IDs em HTTP/events.

**Implementation area**

`platform/contracts`

**Tests**

integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E7-TASK-004 — Grafana dashboard

**Goal**

Criar dashboard mínimo.

**Implementation area**

`infrastructure/monitoring`

**Tests**

manual/smoke

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E7-TASK-005 — Benchmark harness

**Goal**

Automatizar cenário comparável.

**Implementation area**

`scripts/benchmark`

**Tests**

benchmark

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E7-TASK-006 — CI hardening

**Goal**

Garantir todos quality gates.

**Implementation area**

`github actions`

**Tests**

pipeline

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E7-TASK-007 — CD/smoke

**Goal**

Build/deploy/smoke.

**Implementation area**

`pipeline`

**Tests**

smoke

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.
