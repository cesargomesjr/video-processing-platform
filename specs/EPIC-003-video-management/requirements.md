# Requirements — EPIC-003 — Video Management

### E3-FR-001 — Create upload

**Statement**

Usuário autenticado MUST conseguir registrar um vídeo para upload.

**Rationale**

Iniciar jornada.

**Acceptance**

Video PENDING criado.

**Evidence**

Unit + E2E.

### E3-FR-002 — External storage

**Statement**

Vídeo MUST ser armazenado fora do filesystem do container.

**Rationale**

Escalabilidade.

**Acceptance**

Storage key persistida.

**Evidence**

Integration.

### E3-FR-003 — List own videos

**Statement**

Usuário MUST listar apenas seus vídeos.

**Rationale**

Ownership.

**Acceptance**

Nenhum vídeo alheio é retornado.

**Evidence**

E2E.

### E3-FR-004 — Video status

**Statement**

Usuário MUST consultar status e progresso.

**Rationale**

Acompanhamento.

**Acceptance**

Status/progress coerentes.

**Evidence**

Unit + E2E.

### E3-SEC-001 — Signed upload

**Statement**

Upload SHOULD usar URL assinada.

**Rationale**

Evitar proxy de arquivo.

**Acceptance**

URL temporária e limitada.

**Evidence**

Integration.
