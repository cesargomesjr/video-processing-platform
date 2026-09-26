# Design — EPIC-005 — Aggregation & Download

## Context

Este design materializa os requisitos do épico sem substituir ADRs globais.


## Fan-in

Quando um chunk conclui, verificar se todos foram completados.

## Atomic claim

```sql
UPDATE videos
SET status = 'AGGREGATING'
WHERE id = :video_id
  AND status = 'PROCESSING'
  AND completed_chunks = total_chunks;
```

Somente quem atualiza uma linha inicia aggregator.

## ZIP

Preferir streaming para não carregar todos os frames em memória.

## Completion

Após upload do ZIP:

```text
status = COMPLETED
result_storage_key = ...
completed_at = now()
```


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
