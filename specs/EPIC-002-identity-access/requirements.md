# Requirements — EPIC-002 — Identity & Access

### E2-FR-001 — Email/password authentication

**Statement**

O sistema MUST permitir cadastro e login com email e senha por meio do Firebase Authentication.

**Rationale**

Atender ao requisito do desafio sem manter credenciais na API.

**Acceptance**

Uma conta válida obtém um Firebase ID Token; credenciais inválidas não obtêm acesso à API.

**Evidence**

Firebase Authentication Emulator + E2E.

### E2-FR-002 — Authenticated local identity

**Statement**

A API MUST validar o Firebase ID Token e resolver uma identidade local estável a partir do claim `uid`.

**Rationale**

Permitir persistência e ownership independentes do provider.

**Acceptance**

`PUT /auth/me` com token válido provisiona/atualiza a identidade e retorna `id`, `firebaseUid` e `email`; chamadas repetidas retornam o mesmo `id`.

**Evidence**

Unit + integration + E2E.

### E2-SEC-001 — Protected API

**Statement**

Rotas protegidas MUST rejeitar requisições sem Firebase ID Token válido.

**Rationale**

O backend é o boundary de segurança.

**Acceptance**

Token ausente, malformado, expirado, inválido ou de outro projeto resulta em `401`.

**Evidence**

Unit + E2E.

### E2-SEC-002 — Ownership

**Statement**

Um usuário MUST NOT acessar recursos pertencentes a outro usuário.

**Rationale**

Prevenir IDOR e vazamento de dados.

**Acceptance**

Ownership usa o `UserId` interno resolvido no backend e acesso cruzado é negado sem revelar o recurso.

**Evidence**

Unit + E2E.

### E2-SEC-003 — Credential isolation

**Statement**

A API MUST NOT receber, persistir ou registrar senhas, ID Tokens, authorization headers ou credenciais de service account.

**Rationale**

Reduzir superfície de ataque e exposição de segredos.

**Acceptance**

O schema local não possui senha, contratos HTTP não aceitam senha e logs não contêm credenciais.

**Evidence**

Review + integration.

### E2-NFR-001 — Idempotent provisioning

**Statement**

O provisionamento local MUST ser idempotente sob chamadas concorrentes para o mesmo `firebaseUid`.

**Rationale**

Evitar identidades locais duplicadas.

**Acceptance**

Existe apenas um usuário por `firebaseUid`, inclusive após requisições concorrentes.

**Evidence**

Unit + PostgreSQL integration.

### E2-OPS-001 — Local reproducibility

**Statement**

O ambiente local MUST executar API, PostgreSQL e Firebase Authentication Emulator sem depender do Firebase de produção.

**Rationale**

Garantir desenvolvimento e testes determinísticos.

**Acceptance**

O fluxo autenticado essencial é executável localmente via Docker Compose e comandos documentados.

**Evidence**

Compose config + smoke/E2E.
