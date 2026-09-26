# Requirements — EPIC-003 — Video Management

### E3-FR-001 — Create upload

**Statement**

Usuário autenticado MUST registrar um vídeo informando `filename`, `contentType` e `sizeBytes` e receber instruções temporárias de upload.

**Acceptance**

Um `Video` pertencente ao `UserId` autenticado é persistido em `AWAITING_UPLOAD`, com storage key determinística e URL assinada.

**Evidence**

Unit + integration + E2E.

### E3-FR-002 — External private storage

**Statement**

O arquivo MUST ser enviado diretamente para Object Storage privado, sem transitar pelo processo da API ou pelo filesystem do container.

**Acceptance**

Bucket não é público; URL expira; storage key não contém filename fornecido pelo usuário.

**Evidence**

MinIO integration.

### E3-FR-003 — Confirm upload

**Statement**

O proprietário MUST confirmar o upload. A API MUST verificar existência, tamanho e metadata suportada antes de aceitar o objeto.

**Acceptance**

Objeto válido promove `AWAITING_UPLOAD -> PENDING`; objeto ausente ou incompatível não altera o estado.

**Evidence**

Unit + MinIO integration + E2E.

### E3-FR-004 — List own videos

**Statement**

Usuário MUST listar somente seus vídeos com paginação estável por cursor.

**Acceptance**

Resposta ordenada por `createdAt DESC, id DESC`, limite padrão 20, máximo 100 e nenhum recurso alheio.

**Evidence**

Repository integration + E2E.

### E3-FR-005 — Video detail and public status

**Statement**

Usuário MUST consultar detalhe, status e progresso de um vídeo próprio.

**Acceptance**

Recurso próprio é retornado; recurso inexistente ou alheio retorna o mesmo `404 VIDEO_NOT_FOUND`; progresso é `null` enquanto indisponível.

**Evidence**

Unit + E2E.

### E3-SEC-001 — Ownership from authenticated principal

**Statement**

A API MUST derivar ownership exclusivamente do `UserId` autenticado e MUST ignorar qualquer owner enviado pelo cliente.

**Acceptance**

Criação, confirmação, listagem e detalhe são scoped por `UserId`; acesso cruzado não revela existência.

**Evidence**

E2E com dois usuários.

### E3-SEC-002 — Upload constraints

**Statement**

A API MUST validar filename, tamanho declarado, content type, expiração e storage key conforme `upload-policy.md`.

**Acceptance**

Entrada inválida não cria recurso nem emite URL. Confirmação rejeita objeto fora da política.

**Evidence**

Unit + integration.

### E3-NFR-001 — Idempotent confirmation

**Statement**

Confirmações repetidas ou concorrentes MUST produzir uma única transição e um único evento lógico.

**Acceptance**

Repetição retorna sucesso com o estado atual; existe no máximo um outbox `VideoUploaded.v1` por vídeo.

**Evidence**

Unit + PostgreSQL integration concorrente.

### E3-NFR-002 — Reliable event publication

**Statement**

A promoção para `PENDING` e a intenção de publicar `VideoUploaded.v1` MUST ser atômicas. A mensagem MUST ser persistente e confirmada pelo RabbitMQ.

**Acceptance**

Indisponibilidade do broker não reverte a confirmação nem perde a intenção; dispatcher tenta novamente; mensagem só é marcada publicada após publisher confirm.

**Evidence**

PostgreSQL + RabbitMQ integration.

### E3-NFR-003 — Deterministic listing

**Statement**

Paginação MUST permanecer estável para itens com o mesmo timestamp e MUST validar cursor e limite externos.

**Acceptance**

Cursor usa o par `(createdAt, id)`; cursor inválido retorna `400 INVALID_CURSOR`; não há duplicidade entre páginas estáveis.

**Evidence**

Unit + repository integration.

### E3-NFR-004 — Operational readiness

**Statement**

PostgreSQL, Object Storage e RabbitMQ MUST participar do readiness da aplicação.

**Acceptance**

Falha em qualquer dependência obrigatória retorna readiness não pronto sem expor credenciais ou detalhes sensíveis.

**Evidence**

Integration + Compose smoke.
