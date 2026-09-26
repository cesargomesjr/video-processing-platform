# Tasks — EPIC-005 — Aggregation & Download

As tarefas abaixo são unidades técnicas de execução. Não representam novos requisitos.

## E5-TASK-001 — Fan-in use case

**Goal**

Detectar elegibilidade.

**Implementation area**

`application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E5-TASK-002 — Atomic aggregation claim

**Goal**

Implementar repository operation.

**Implementation area**

`infrastructure`

**Tests**

concurrency integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E5-TASK-003 — Archive port

**Goal**

Definir ResultArchiveBuilder.

**Implementation area**

`application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E5-TASK-004 — ZIP adapter

**Goal**

Implementar streaming ZIP.

**Implementation area**

`infrastructure`

**Tests**

integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E5-TASK-005 — Persist result

**Goal**

Salvar ZIP e completar Video.

**Implementation area**

`application/infrastructure`

**Tests**

unit + integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E5-TASK-006 — Download endpoint

**Goal**

Gerar signed URL para owner.

**Implementation area**

`presentation/application`

**Tests**

E2E

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.
