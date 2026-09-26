# Design — EPIC-007 — Observability & DevOps

## Context

Este design materializa os requisitos do épico sem substituir ADRs globais.


## Logs

JSON estruturado.

## Metrics

Prometheus.

## Dashboard

Grafana:

- received;
- completed;
- failed;
- processing duration;
- queue depth;
- active workers;
- retries;
- DLQ.

## Benchmark

Matriz inicial:

```text
1 worker
2 workers
4 workers
8 workers
```

Medir:

- total duration;
- CPU;
- memory;
- storage throughput;
- frames/sec;
- queue depth.


## Clean Architecture

- Domain não conhece provider;
- Application define ports;
- Infrastructure implementa;
- Presentation traduz transportes;
- Main compõe.

## Error strategy

- Domain Error para violação de negócio;
- Application Error para falhas de caso de uso quando necessário;
- provider errors mapeados na borda;
- Presentation mapeia erros para HTTP/message behavior.

## Security

Aplicar ownership, validation e secret hygiene quando aplicável.

## Observability

Adicionar correlation IDs e logs nos boundaries relevantes.

## Alternatives

Alternativas relevantes devem virar task decision ou ADR quando tiverem impacto futuro.

## Exit criteria

Design pronto quando não houver decisão material pendente para iniciar TDD.
