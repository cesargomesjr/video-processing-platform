# Tasks — EPIC-004 — Distributed Video Processing

As tarefas abaixo são unidades técnicas de execução. Não representam novos requisitos.

## E4-TASK-001 — Metadata port and ffprobe adapter

**Goal**

Criar contrato e adapter.

**Implementation area**

`video-processing`

**Tests**

unit + integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E4-TASK-002 — Chunk policy

**Goal**

Implementar cálculo determinístico.

**Implementation area**

`domain/application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E4-TASK-003 — Chunk model/repository

**Goal**

Persistir unidade de trabalho.

**Implementation area**

`domain/application/infrastructure`

**Tests**

unit + integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E4-TASK-004 — Orchestrator

**Goal**

Criar chunks e publicar jobs.

**Implementation area**

`application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E4-TASK-005 — Message contracts

**Goal**

Definir ProcessVideoChunk e ChunkCompleted.

**Implementation area**

`public/contracts`

**Tests**

contract tests

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E4-TASK-006 — FFmpeg extractor port

**Goal**

Criar port testável.

**Implementation area**

`application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E4-TASK-007 — FFmpeg adapter

**Goal**

Usar spawn e paths determinísticos.

**Implementation area**

`infrastructure`

**Tests**

integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E4-TASK-008 — Chunk consumer

**Goal**

Implementar idempotência.

**Implementation area**

`presentation/application`

**Tests**

unit + integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E4-TASK-009 — Retry topology

**Goal**

Configurar retry + TTL.

**Implementation area**

`infrastructure`

**Tests**

integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E4-TASK-010 — DLQ topology

**Goal**

Configurar DLQ.

**Implementation area**

`infrastructure`

**Tests**

integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E4-TASK-011 — Atomic progress

**Goal**

Atualizar completed_chunks com atomicidade.

**Implementation area**

`repository adapter`

**Tests**

integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E4-TASK-012 — Concurrency config

**Goal**

Adicionar limite configurável.

**Implementation area**

`main/infrastructure`

**Tests**

benchmark

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.
