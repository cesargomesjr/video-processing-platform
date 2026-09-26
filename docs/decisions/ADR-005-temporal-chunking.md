# ADR-005 — Temporal Chunking

## Status
Accepted

## Decision
Dividir logicamente o vídeo por intervalos temporais. Não gerar arquivos de vídeo intermediários por padrão.

## Consequences
Retry granular e paralelismo intra-video; exige fan-in.
