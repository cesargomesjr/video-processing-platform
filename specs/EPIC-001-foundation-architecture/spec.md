# Specification — EPIC-001 — Foundation & Architecture

## Objective

Estabelecer o core técnico e arquitetural executável para os demais épicos.

## Business outcome

Entregar uma API mínima, testável, empacotável e protegida por quality gates, preservando os boundaries arquiteturais.

## Scope

- monorepo npm com `apps/api`;
- Clean Architecture por bounded context;
- TypeScript strict, ESM e NestJS;
- configuração validada na borda;
- endpoint de liveness;
- testes e coverage global >= 80%;
- enforcement automático de dependências;
- imagem OCI da API;
- execução local da API via Docker Compose;
- CI e publicação contínua da imagem.

## Out of scope

- contexts funcionais ainda sem comportamento;
- autenticação e persistência de usuários;
- PostgreSQL, migrations e repositories;
- RabbitMQ;
- MinIO/Object Storage;
- upload e processamento de vídeo;
- logging estruturado, métricas e tracing.

PostgreSQL será introduzido no EPIC-002. RabbitMQ e MinIO serão introduzidos no EPIC-003. A suíte open source de observabilidade será implementada no EPIC-007.

## Decisions

- Node.js 24 e npm 11;
- NestJS 12 e TypeScript 5.9 em ESM/NodeNext;
- Jest para testes e coverage;
- ESLint e dependency-cruiser para quality/architecture rules;
- GitHub Actions para CI e delivery;
- GHCR como registry da imagem;
- nenhum bounded context vazio será criado.

## Risks

- acoplamento indevido entre camadas;
- estrutura prematura sem comportamento;
- configuração externa não validada;
- pipeline divergente da execução local;
- provider leaking nos próximos épicos.
