# Specification — EPIC-003 — Video Management

## Objective

Entregar ingestão segura, persistência, listagem e consulta de status dos vídeos.

## Business outcome

Entregar um incremento coerente, testável e rastreável que preserve os boundaries arquiteturais.

## Scope

- Video
- signed upload
- upload confirmation
- list
- detail
- status
- progress

## Out of scope

- FFmpeg
- chunk processing
- ZIP

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
