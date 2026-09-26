# Observabilidade

## Logs

Campos:

```json
{
  "service": "video-processor",
  "correlationId": "uuid",
  "traceId": "uuid",
  "videoId": "uuid",
  "chunkId": "uuid",
  "messageId": "uuid",
  "level": "INFO",
  "message": "Chunk completed"
}
```

## Métricas

```text
videos_received_total
videos_completed_total
videos_failed_total
chunks_processed_total
chunks_failed_total
video_processing_duration_seconds
chunk_processing_duration_seconds
queue_depth
worker_active_jobs
retry_total
dlq_total
zip_generation_duration_seconds
```

## Tracing

Propagar `traceId` e `correlationId` por headers/event envelope.
