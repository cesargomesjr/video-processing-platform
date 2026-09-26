# Catálogo de Eventos e Comandos

## Envelope padrão

```json
{
  "eventId": "uuid",
  "eventType": "VideoUploaded",
  "eventVersion": 1,
  "occurredAt": "ISO-8601",
  "correlationId": "uuid",
  "payload": {}
}
```

## VideoUploaded

Produtor: Video Management  
Consumidor: Analyzer

```json
{
  "videoId": "uuid",
  "storageKey": "videos/uuid/original.mp4"
}
```

## VideoAnalyzed

Produtor: Analyzer  
Consumidor: Orchestrator

```json
{
  "videoId": "uuid",
  "durationSeconds": 1800,
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "codec": "h264"
}
```

## ProcessVideoChunk

Produtor: Orchestrator  
Consumidor: Worker

```json
{
  "videoId": "uuid",
  "chunkId": "uuid",
  "sequence": 3,
  "startTimeSeconds": 600,
  "durationSeconds": 300,
  "storageKey": "videos/uuid/original.mp4"
}
```

## ChunkCompleted

Produtor: Worker  
Consumidor: fan-in coordinator

```json
{
  "videoId": "uuid",
  "chunkId": "uuid",
  "sequence": 3,
  "outputPath": "frames/uuid/chunk-0003/"
}
```

## VideoCompleted

Produtor: Aggregator  
Consumidor: Video Management / Notification

```json
{
  "videoId": "uuid",
  "resultStorageKey": "results/uuid/frames.zip"
}
```

## VideoProcessingFailed

```json
{
  "videoId": "uuid",
  "reason": "PROCESSING_FAILED"
}
```

## Regras

- `eventId` obrigatório;
- `correlationId` obrigatório;
- payloads externos validados;
- consumers idempotentes;
- mensagens desconhecidas rejeitadas de forma segura;
- provider-specific types não atravessam boundaries.
