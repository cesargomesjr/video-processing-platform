# Specification — EPIC-002 — Identity & Access

## Objective

Entregar autenticação e autorização por ownership com domínio e contratos testáveis.

## Business outcome

Entregar um incremento coerente, testável e rastreável que preserve os boundaries arquiteturais.

## Scope

- User
- register
- login
- password hash
- token
- ownership

## Out of scope

- SSO
- MFA
- RBAC avançado

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
