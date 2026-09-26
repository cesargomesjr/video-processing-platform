# Acceptance — EPIC-002 — Identity & Access

## Gate 1 — Ready for Design

- [x] objetivo compreendido
- [x] escopo definido
- [x] out-of-scope definido
- [x] requisitos identificados
- [x] riscos conhecidos
- [x] ambiguidades materiais registradas

## Gate 2 — Ready for Development

- [x] `spec.md` aprovado
- [x] `requirements.md` aprovado
- [x] `design.md` aprovado
- [x] ADRs aplicáveis lidos
- [x] contratos definidos quando aplicável
- [x] estratégia de testes definida
- [x] segurança avaliada
- [x] concorrência/idempotência avaliadas quando aplicável

## Acceptance criteria

- [x] E2-FR-001 — Email/password authentication
- [x] E2-FR-002 — Authenticated local identity
- [x] E2-SEC-001 — Protected API
- [x] E2-SEC-002 — Ownership policy
- [x] E2-SEC-003 — Credential isolation
- [x] E2-NFR-001 — Idempotent provisioning
- [x] E2-OPS-001 — Local reproducibility

## Gate 3 — Done

- [x] critérios acima satisfeitos
- [x] testes novos cobrindo o comportamento
- [x] coverage >= 80%
- [x] lint passa
- [x] typecheck passa
- [x] testes passam
- [x] build passa
- [x] docs atualizados
- [x] matriz de rastreabilidade atualizada

## Evidence — 2026-09-26

- `npm run verify`;
- 16 suites e 59 testes de aplicação;
- 8 testes de tooling;
- cobertura global: 96.4% statements/lines, 92.74% branches e 96.66% functions;
- Docker Compose com API, PostgreSQL e Firebase Authentication Emulator saudáveis;
- migration `001-create-users` aplicada;
- cadastro email/senha no emulator e ID Token aceito pela API;
- repetição de `PUT /auth/me` preservando o mesmo `UserId`;
- dez provisionamentos concorrentes resultando em um único `UserId`;
- requisição sem bearer token retornando `401 AUTHENTICATION_REQUIRED`.

O EPIC-002 entrega a política de ownership testada em unidade. Todo contexto que introduzir recurso pertencente a usuário, começando pelo EPIC-003, deve aplicá-la e adicionar seu E2E de acesso cruzado.
