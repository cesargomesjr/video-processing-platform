# EPIC-003 — Video Management

## Objective

Entregar ingestão segura, persistência, listagem e consulta de status dos vídeos de um usuário autenticado.

## Documents

- `spec.md` — escopo, decisões e dependências;
- `requirements.md` — requisitos rastreáveis;
- `design.md` — domínio, fluxos e estratégia de implementação;
- `upload-policy.md` — validação, storage key e expiração;
- `outbox-policy.md` — publicação confiável do `VideoUploaded`;
- `acceptance.md` — gates e critérios;
- `tasks.md` — decomposição executável;
- `testing.md` — plano de testes;
- `traceability.md` — requisito -> tarefa -> teste;
- `features/` — comportamento observável em Gherkin.

## Decisions closed by refinement

- upload direto para Object Storage privado por URL assinada;
- `Video` nasce em `AWAITING_UPLOAD` e passa para `PENDING` após confirmação;
- confirmação verifica o objeto e é idempotente;
- ownership sempre deriva do `UserId` autenticado;
- listagem usa paginação por cursor;
- `VideoUploaded` é gravado em transactional outbox na mesma transação da mudança de estado;
- publicação RabbitMQ usa mensagem persistente, publisher confirm e fila durável;
- PostgreSQL, MinIO e RabbitMQ participam do readiness.

## Refinement status

Gate 2 aprovado em 2026-09-26. O EPIC-003 está Ready for Development.

## Execution rule

A implementação começa somente após o Gate 2 estar aprovado. Alterações nas decisões acima exigem atualização do design, critérios de aceite e rastreabilidade antes do código.
