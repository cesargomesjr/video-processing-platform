# Specification — EPIC-004 — Distributed Video Processing

## Objective

Entregar o pipeline distribuído de análise, chunking, fan-out, processamento paralelo, retry, DLQ e idempotência.

## Business outcome

Entregar um incremento coerente, testável e rastreável que preserve os boundaries arquiteturais.

## Scope

- ffprobe
- chunk policy
- orchestrator
- workers
- FFmpeg
- retry
- DLQ
- idempotency
- progress

## Out of scope

- ZIP final
- download final
- notification provider

## Dependencies

Consultar:

- `docs/architecture/architecture.md`;
- `docs/architecture/context-map.md`;
- ADRs aplicáveis;
- requisitos dos épicos anteriores.

## Risks

- acoplamento indevido;
- comportamento sem teste;
- regras em adapters;
- concorrência não tratada;
- provider leaking;
- premature abstraction.

## Open questions

Qualquer dúvida que afete domínio, segurança, persistência, contrato público ou concorrência deve ser resolvida antes do Gate 2.
