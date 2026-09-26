# Requirements — EPIC-006 — Notifications

### E6-FR-001 — Failure notification

**Statement**

Falha definitiva SHOULD gerar notificação.

**Rationale**

Experiência do usuário.

**Acceptance**

Evento consumido e provider chamado.

**Evidence**

Integration.

### E6-NFR-001 — Isolation

**Statement**

Falha no provider MUST NOT reprocessar vídeo.

**Rationale**

Separação de responsabilidades.

**Acceptance**

Processamento mantém estado.

**Evidence**

Unit.

### E6-NFR-002 — Port/adapter

**Statement**

Provider externo MUST ser acessado via port.

**Rationale**

Baixo acoplamento.

**Acceptance**

Application não conhece SDK.

**Evidence**

Architecture review.
