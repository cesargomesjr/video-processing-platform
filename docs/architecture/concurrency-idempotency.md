# Concorrência e Idempotência

## Redelivery

RabbitMQ opera assumindo entrega pelo menos uma vez.

Logo:

```text
mesma mensagem pode ser consumida novamente
```

## Regra do chunk

```text
if chunk.status == COMPLETED:
    ACK
    return
```

## Progresso

Evitar read-modify-write:

```text
read completed_chunks
+ 1
save
```

Preferir atualização atômica:

```sql
UPDATE videos
SET completed_chunks = completed_chunks + 1
WHERE id = :video_id;
```

## Dupla agregação

Usar promoção atômica:

```sql
UPDATE videos
SET status = 'AGGREGATING'
WHERE id = :video_id
  AND status = 'PROCESSING'
  AND completed_chunks = total_chunks;
```

Somente o processo que afetar uma linha inicia agregação.

## Concurrency

Configuração inicial:

```env
VIDEO_PROCESSOR_CONCURRENCY=4
```

Valor final deve ser definido por benchmark.
