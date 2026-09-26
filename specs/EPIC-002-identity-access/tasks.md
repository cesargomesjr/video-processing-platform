# Tasks — EPIC-002 — Identity & Access

As tarefas abaixo são unidades técnicas de execução. Não representam novos requisitos.

## E2-TASK-001 — Model User

**Goal**

Criar entidade/VOs/erros necessários.

**Implementation area**

`identity/domain`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-002 — User repository port

**Goal**

Definir contrato orientado ao domínio.

**Implementation area**

`identity/application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-003 — Register use case

**Goal**

Implementar TDD do cadastro.

**Implementation area**

`identity/application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-004 — Login use case

**Goal**

Implementar autenticação.

**Implementation area**

`identity/application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-005 — Persistence adapter

**Goal**

Persistir User em PostgreSQL.

**Implementation area**

`identity/infrastructure`

**Tests**

integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-006 — Password adapter

**Goal**

Implementar hashing.

**Implementation area**

`identity/infrastructure`

**Tests**

integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-007 — Token adapter

**Goal**

Implementar token com expiração.

**Implementation area**

`identity/infrastructure`

**Tests**

unit/integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-008 — HTTP controllers

**Goal**

Criar controllers finos.

**Implementation area**

`identity/presentation`

**Tests**

E2E

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.
