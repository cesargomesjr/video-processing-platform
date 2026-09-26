# Acceptance — EPIC-003 — Video Management

## Gate 1 — Ready for Design

- [x] objetivo e resultado de negócio compreendidos
- [x] escopo e out-of-scope definidos
- [x] requisitos funcionais, segurança e não funcionais identificados
- [x] riscos e dependências conhecidos
- [x] decisões materiais registradas no refinamento

## Gate 2 — Ready for Development

- [x] `spec.md` aprovado pelo time
- [x] `requirements.md` aprovado pelo time
- [x] `design.md` aprovado pelo time
- [x] ADRs aplicáveis lidos
- [x] contratos HTTP, evento, storage e persistência definidos
- [x] política de upload definida
- [x] estratégia transactional outbox definida
- [x] estratégia de testes definida
- [x] segurança e ownership avaliados
- [x] concorrência e idempotência avaliadas
- [x] fronteira com EPIC-004/005/007 explícita

Gate 2 aprovado em 2026-09-26. Implementacao concluida e validada no Gate 3 em 2026-09-26.

## Acceptance criteria

- [x] E3-FR-001 — criação autenticada persiste `AWAITING_UPLOAD` e retorna upload assinado
- [x] E3-FR-002 — arquivo permanece em bucket privado e não atravessa a API
- [x] E3-FR-003 — confirmação verifica objeto e promove para `PENDING`
- [x] E3-FR-004 — listagem paginada retorna somente vídeos próprios
- [x] E3-FR-005 — detalhe/status próprio funciona e recurso alheio retorna `404`
- [x] E3-SEC-001 — ownership deriva somente do principal autenticado
- [x] E3-SEC-002 — filename, formato, tamanho, chave e expiração obedecem à política
- [x] E3-NFR-001 — confirmação repetida/concorrente gera uma transição e um evento lógico
- [x] E3-NFR-002 — estado e outbox são atômicos; publicação usa mensagem persistente e confirm
- [x] E3-NFR-003 — cursor/limite são validados e paginação é determinística
- [x] E3-NFR-004 — PostgreSQL, MinIO e RabbitMQ participam do readiness

## Gate 3 — Done

- [x] todos os criterios acima satisfeitos
- [x] testes unitarios, integracao e E2E cobrindo o comportamento
- [x] smoke Compose completo executado
- [x] coverage global >= 80% em todas as dimensoes
- [x] lint e regras arquiteturais passam
- [x] typecheck passa
- [x] testes passam
- [x] build passa
- [x] documentacao global sincronizada
- [x] matriz de rastreabilidade atualizada com evidencias reais
- [x] nenhum segredo, token ou URL assinada aparece em logs/artefatos

## Evidence record

Gate 3 validado em 2026-09-26.

| Evidence | Command/test | Result |
|---|---|---|
| Architecture | `npm run lint` | passed; ESLint passed and dependency-cruiser reported 0 violations across 82 modules / 167 dependencies |
| Types | `npm run typecheck` | passed |
| Tests | `npm run test` | passed; 21 Jest suites / 92 Jest tests plus 8 Node tooling tests |
| Coverage | `npm run test:cov` | passed; statements 84.44%, branches 88.54%, functions 86.47%, lines 84.44% |
| Build | `npm run build` | passed |
| Compose config | `docker compose config --quiet` | passed |
| Compose runtime | `docker compose up --detach --build api`, `docker compose ps`, `curl -fsS http://127.0.0.1:3020/health/ready` | passed; API healthy and readiness returned database/objectStorage/messageBroker up |
| Database migrations | `docker compose exec -T postgres psql ...` | passed; migrations `001-create-users`, `002-create-videos-and-outbox`, `003-enforce-video-verified-metadata` and constraint `videos_verified_metadata_by_status` present |
| Real upload smoke | Firebase emulator token + signed PUT to MinIO + `POST /videos/:id/upload-completed` + list/detail checks | passed; direct upload stayed outside API, confirmation moved video to `PENDING`, outbox message was persisted/published |
| Broker outage smoke | RabbitMQ stopped before confirmation and restarted after retry | passed; request/data were not lost, readiness reflected outage, pending outbox published after broker recovery |

