# Requirements — EPIC-005 — Aggregation & Download

### E5-FR-001 — Fan-in

**Statement**

Aggregation MUST iniciar somente quando todos os chunks estiverem completos.

**Rationale**

Consistência.

**Acceptance**

Nenhuma agregação prematura.

**Evidence**

Unit + integration.

### E5-NFR-001 — Single aggregation

**Statement**

Somente uma agregação MUST iniciar por vídeo.

**Rationale**

Evitar ZIP duplicado.

**Acceptance**

Atomic claim.

**Evidence**

Concurrency integration.

### E5-FR-002 — ZIP

**Statement**

Resultado MUST ser consolidado em ZIP.

**Rationale**

Entrega do produto.

**Acceptance**

ZIP válido persistido.

**Evidence**

Integration.

### E5-FR-003 — Download

**Statement**

Owner MUST obter URL temporária após COMPLETED.

**Rationale**

Entrega segura.

**Acceptance**

Signed URL retornada.

**Evidence**

E2E.

### E5-SEC-001 — Ownership

**Statement**

Download MUST respeitar ownership.

**Rationale**

Segurança.

**Acceptance**

Outro usuário recebe acesso negado.

**Evidence**

E2E.
