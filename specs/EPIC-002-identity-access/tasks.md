# Tasks — EPIC-002 — Identity & Access

As tarefas abaixo são unidades técnicas de execução. Não representam novos requisitos.

## E2-TASK-001 — Model local identity

**Goal**

Criar `User`, `UserId`, `FirebaseUid` e erros de domínio necessários.

**Implementation area**

`identity/domain`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-002 — Define identity ports

**Goal**

Definir `UserRepository`, `IdentityTokenVerifier` e `VerifiedIdentity` sem dependência de Firebase.

**Implementation area**

`identity/application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-003 — Resolve authenticated user

**Goal**

Implementar via TDD o find-or-create idempotente por `FirebaseUid`, incluindo conflito concorrente.

**Implementation area**

`identity/application`

**Tests**

unit

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-004 — Firebase token verifier adapter

**Goal**

Validar Firebase ID Token e traduzir claims/erros por meio do Firebase Admin SDK.

**Implementation area**

`identity/infrastructure`

**Tests**

unit/integration com Authentication Emulator

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-005 — PostgreSQL user repository

**Goal**

Persistir `User` e resolver identidade por `firebase_uid` com segurança concorrente.

**Implementation area**

`identity/infrastructure`

**Tests**

integration

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-006 — PostgreSQL schema and readiness

**Goal**

Adicionar PostgreSQL ao Compose, migration de `users` e dependência do banco no readiness.

**Implementation area**

`platform/database` e `main`

**Tests**

integration/smoke

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-007 — Authentication boundary

**Goal**

Extrair bearer token, validar identidade e disponibilizar principal autenticado às rotas protegidas.

**Implementation area**

`identity/presentation`

**Tests**

unit/E2E

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-008 — Authenticated identity endpoint

**Goal**

Implementar `PUT /auth/me` com provisionamento idempotente e contrato de erros.

**Implementation area**

`identity/presentation`

**Tests**

E2E

**Done when**

- implementação concluída;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-009 — Ownership policy

**Goal**

Definir e testar o uso obrigatório do `UserId` autenticado nos recursos pertencentes a usuário, sem confiar em IDs enviados pelo cliente.

**Implementation area**

`identity/application` e contexts consumidores

**Tests**

unit/E2E

**Done when**

- acesso ao próprio recurso é permitido;
- acesso cruzado não revela a existência do recurso;
- testes correspondentes passam;
- architecture boundaries preservados;
- documentação afetada atualizada.

## E2-TASK-010 — Local Firebase environment

**Goal**

Adicionar Authentication Emulator ao ambiente local, configurar `FIREBASE_PROJECT_ID` e impedir emulator em produção.

**Implementation area**

`main`, Docker Compose e documentação local

**Tests**

integration/E2E/smoke

**Done when**

- cadastro/login email-senha pode ser exercitado no emulator;
- a API valida tokens emitidos pelo emulator;
- nenhum segredo Firebase é versionado;
- configuração de produção rejeita `FIREBASE_AUTH_EMULATOR_HOST`;
- testes correspondentes passam;
- documentação afetada atualizada.
