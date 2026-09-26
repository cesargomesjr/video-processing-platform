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

Gate 2 aprovado em 2026-09-26. O EPIC-003 está Ready for Development; os critérios funcionais e o Gate 3 permanecem pendentes até a implementação e suas evidências.

## Acceptance criteria

- [ ] E3-FR-001 — criação autenticada persiste `AWAITING_UPLOAD` e retorna upload assinado
- [ ] E3-FR-002 — arquivo permanece em bucket privado e não atravessa a API
- [ ] E3-FR-003 — confirmação verifica objeto e promove para `PENDING`
- [ ] E3-FR-004 — listagem paginada retorna somente vídeos próprios
- [ ] E3-FR-005 — detalhe/status próprio funciona e recurso alheio retorna `404`
- [ ] E3-SEC-001 — ownership deriva somente do principal autenticado
- [ ] E3-SEC-002 — filename, formato, tamanho, chave e expiração obedecem à política
- [ ] E3-NFR-001 — confirmação repetida/concorrente gera uma transição e um evento lógico
- [ ] E3-NFR-002 — estado e outbox são atômicos; publicação usa mensagem persistente e confirm
- [ ] E3-NFR-003 — cursor/limite são validados e paginação é determinística
- [ ] E3-NFR-004 — PostgreSQL, MinIO e RabbitMQ participam do readiness

## Gate 3 — Done

- [ ] todos os critérios acima satisfeitos
- [ ] testes unitários, integração e E2E cobrindo o comportamento
- [ ] smoke Compose completo executado
- [ ] coverage global >= 80% em todas as dimensões
- [ ] lint e regras arquiteturais passam
- [ ] typecheck passa
- [ ] testes passam
- [ ] build passa
- [ ] documentação global sincronizada
- [ ] matriz de rastreabilidade atualizada com evidências reais
- [ ] nenhum segredo, token ou URL assinada aparece em logs/artefatos

## Evidence record

Preencher durante execução:

| Evidence | Command/test | Result |
|---|---|---|
| Architecture | `npm run lint` | pending |
| Types | `npm run typecheck` | pending |
| Tests | `npm run test` | pending |
| Coverage | `npm run test:cov` | pending |
| Build | `npm run build` | pending |
| Compose | `docker compose config --quiet` + smoke | pending |
