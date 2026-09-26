# Acceptance — EPIC-001 — Foundation & Architecture

## Gate 1 — Ready for Design

- [x] objetivo compreendido;
- [x] escopo e out-of-scope definidos;
- [x] requisitos identificados;
- [x] riscos conhecidos;
- [x] ambiguidades materiais resolvidas.

## Gate 2 — Ready for Development

- [x] spec, requirements e design aprovados pelas decisões do projeto;
- [x] ADRs aplicáveis considerados;
- [x] contrato de liveness definido;
- [x] estratégia de testes definida;
- [x] segurança avaliada;
- [x] dependências externas e observabilidade explicitamente adiadas.

## Acceptance criteria

- [x] E1-AR-001 — Clean Architecture;
- [x] E1-AR-002 — Bounded contexts sem estrutura vazia;
- [x] E1-FR-001 — Liveness;
- [x] E1-NFR-001 — Coverage;
- [x] E1-NFR-002 — Configuration validation;
- [x] E1-OPS-001 — Container image;
- [x] E1-OPS-002 — CI/CD;
- [x] E1-OPS-003 — Local Compose runtime.

## Gate 3 — Done

- [x] critérios acima satisfeitos;
- [x] testes novos cobrindo o comportamento;
- [x] coverage >= 80%;
- [x] lint e architecture checks passam;
- [x] typecheck passa;
- [x] testes passam;
- [x] build passa;
- [x] Docker build e smoke passam;
- [x] docs e matrizes de rastreabilidade atualizadas.

## External evidence

A execução local valida os mesmos comandos da CI. A primeira execução hospedada e a publicação no GHCR ocorrerão após os arquivos serem versionados e enviados ao GitHub.
