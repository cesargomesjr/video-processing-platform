# ADR-001 — Clean Architecture

## Status
Accepted

## Context
O projeto integra HTTP, mensageria, persistência, FFmpeg e storage.

## Decision
Usar Clean Architecture com dependency direction inward.

## Consequences
Positivas:
- testabilidade;
- isolamento de providers;
- domínio explícito.

Negativas:
- maior necessidade de mappings;
- maior disciplina estrutural.
