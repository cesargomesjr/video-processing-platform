# Specification — EPIC-005 — Aggregation & Download

## Objective

Entregar fan-in, ZIP final e download seguro.

## Business outcome

Entregar um incremento coerente, testável e rastreável que preserve os boundaries arquiteturais.

## Scope

- fan-in
- atomic aggregation claim
- ZIP
- result storage
- COMPLETED
- signed download

## Out of scope

- email notification

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
