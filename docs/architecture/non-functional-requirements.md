# Requisitos Não Funcionais

## NFR-001 — Escalabilidade

Workers devem escalar horizontalmente de forma independente da API.

## NFR-002 — Resiliência

Falhas transitórias devem usar retry; falhas definitivas devem seguir para DLQ.

## NFR-003 — Idempotência

Consumers devem tolerar mensagens duplicadas.

## NFR-004 — Performance

Chunk size e concurrency devem ser configuráveis e validados por benchmark.

## NFR-005 — Testabilidade

Domain/Application devem ser testáveis sem banco, fila, rede, storage ou FFmpeg reais.

## NFR-006 — Coverage

Mínimo global:

- lines >= 80%;
- statements >= 80%;
- functions >= 80%;
- branches >= 80%.

## NFR-007 — Segurança

Storage, DB e broker privados. URLs assinadas com expiração.

## NFR-008 — Observabilidade

Logs estruturados e métricas obrigatórios em fluxos críticos.

## NFR-009 — Manutenibilidade

Código deve priorizar legibilidade, nomes de domínio e responsabilidades coesas.
