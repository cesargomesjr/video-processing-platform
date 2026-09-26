# Chunking Policy

## Objetivo

Encontrar equilíbrio entre paralelismo e overhead.

## Política inicial

```text
duration < 120s
  -> 1 chunk

120s <= duration <= 600s
  -> 120s chunks

600s < duration <= 1800s
  -> 300s chunks

duration > 1800s
  -> 600s chunks
```

## Invariantes

- chunks cobrem todo o vídeo;
- não há gaps;
- não há overlap lógico;
- último chunk pode ser menor;
- sequência começa em 0 ou 1, mas deve ser consistente.

## Benchmark

A política é inicial e deve ser validada por medição.
