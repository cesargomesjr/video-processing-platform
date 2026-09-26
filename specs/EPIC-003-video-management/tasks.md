# Tasks — EPIC-003 — Video Management

As tarefas abaixo são unidades técnicas de execução. Não representam novos requisitos.

## E3-TASK-001 — Model Video

**Goal**

Criar entidade, statuses e erros.

**Implementation area**

`video-management/domain`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E3-TASK-002 — Video repository

**Goal**

Definir port e queries scoped por userId.

**Implementation area**

`application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E3-TASK-003 — Storage port

**Goal**

Definir createUploadUrl/getDownloadUrl quando aplicável.

**Implementation area**

`application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E3-TASK-004 — Create upload use case

**Goal**

Implementar criação do Video.

**Implementation area**

`application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E3-TASK-005 — Confirm upload

**Goal**

Validar ownership e publicar VideoUploaded.

**Implementation area**

`application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E3-TASK-006 — List/detail

**Goal**

Implementar queries com ownership.

**Implementation area**

`application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E3-TASK-007 — Postgres adapter

**Goal**

Mapear persistence <-> domain.

**Implementation area**

`infrastructure`

**Tests**

integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E3-TASK-008 — Storage adapter

**Goal**

Implementar MinIO/S3-compatible.

**Implementation area**

`infrastructure`

**Tests**

integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E3-TASK-009 — HTTP endpoints

**Goal**

Controllers finos.

**Implementation area**

`presentation`

**Tests**

E2E

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.
