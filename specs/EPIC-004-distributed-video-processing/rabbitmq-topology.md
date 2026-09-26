# RabbitMQ Topology

## Queues

```text
video.analysis
video.chunks
video.aggregation
video.notifications

video.analysis.retry
video.chunks.retry
video.aggregation.retry

video.analysis.dlq
video.chunks.dlq
video.aggregation.dlq
```

## Retry example

```text
attempt 1 -> 30s
attempt 2 -> 2m
attempt 3 -> 10m
then -> DLQ
```

Valores finais devem ser configuráveis.
