# Requirements — EPIC-002 — Identity & Access

### E2-FR-001 — Register

**Statement**

Usuário MUST conseguir se registrar com email e senha válidos.

**Rationale**

Base de identidade.

**Acceptance**

Usuário persistido sem senha em texto claro.

**Evidence**

Unit + E2E.

### E2-FR-002 — Login

**Statement**

Usuário MUST conseguir autenticar com credenciais válidas.

**Rationale**

Acesso protegido.

**Acceptance**

Token válido emitido.

**Evidence**

Unit + E2E.

### E2-SEC-001 — Ownership

**Statement**

Usuário MUST NOT acessar recurso de outro usuário.

**Rationale**

Prevenir IDOR.

**Acceptance**

Acesso negado.

**Evidence**

Unit + E2E.

### E2-SEC-002 — Password storage

**Statement**

Senha MUST ser armazenada somente como hash.

**Rationale**

Proteção de credencial.

**Acceptance**

DB não possui senha plain text.

**Evidence**

Integration.

### E2-NFR-001 — Server-side authorization

**Statement**

Autorização MUST ocorrer no backend.

**Rationale**

Frontend não é boundary de segurança.

**Acceptance**

Rotas protegidas validam identidade.

**Evidence**

E2E.
