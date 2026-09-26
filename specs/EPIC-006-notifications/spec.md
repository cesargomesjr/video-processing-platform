# Specification — EPIC-006 — Notifications

## Objective

Notificar falhas definitivas sem acoplar processamento ao provider.

## Business outcome

Entregar um incremento coerente, testável e rastreável que preserve os boundaries arquiteturais.

## Scope

- failure event
- notification use case
- provider adapter
- retry próprio

## Out of scope

- marketing
- preferences center

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
