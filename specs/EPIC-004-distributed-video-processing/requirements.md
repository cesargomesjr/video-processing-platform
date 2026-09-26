# Requirements — EPIC-004 — Distributed Video Processing

### E4-FR-001 — Analyze

**Statement**

Analyzer MUST obter duração, fps, resolução e codec.

**Rationale**

Planejar chunks.

**Acceptance**

Metadados persistidos.

**Evidence**

Integration.

### E4-FR-002 — Chunking

**Statement**

Orchestrator MUST gerar chunks temporais determinísticos.

**Rationale**

Fan-out.

**Acceptance**

Cobertura integral sem sobreposição indevida.

**Evidence**

Unit.

### E4-FR-003 — Parallel processing

**Statement**

Chunks SHOULD processar em paralelo até limite configurado.

**Rationale**

Performance.

**Acceptance**

Concurrency respeitada.

**Evidence**

Benchmark/integration.

### E4-NFR-001 — Idempotency

**Statement**

Consumer MUST tolerar duplicate delivery.

**Rationale**

At-least-once.

**Acceptance**

Chunk COMPLETED não reprocessa.

**Evidence**

Unit + integration.

### E4-NFR-002 — Retry

**Statement**

Falha transitória MUST usar retry.

**Rationale**

Resiliência.

**Acceptance**

Retry count incrementado.

**Evidence**

Integration.

### E4-NFR-003 — DLQ

**Statement**

Max attempts MUST encaminhar para DLQ.

**Rationale**

Isolar poison messages.

**Acceptance**

Mensagem em DLQ.

**Evidence**

Integration.

### E4-NFR-004 — Atomic progress

**Statement**

Progresso MUST ser atualizado atomicamente.

**Rationale**

Concorrência.

**Acceptance**

Counter consistente.

**Evidence**

Integration.
