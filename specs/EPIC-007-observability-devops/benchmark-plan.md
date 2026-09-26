# Benchmark Plan

## Objetivo

Descobrir o sweet spot de chunk size e concurrency.

## Cenário base

Mesmo vídeo, mesma máquina, mesmo storage.

## Matriz

```text
1 worker / concurrency 1
2 workers / concurrency 1
4 workers / concurrency 1
8 workers / concurrency 1

1 worker / concurrency 2
1 worker / concurrency 4
```

## Métricas

- tempo total;
- CPU;
- memória;
- I/O;
- frames/sec;
- queue depth;
- retry count;
- storage throughput.

## Regra

Não assumir escalabilidade linear.
