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

## VideoUploaded.v1

Produtor: Video Management
Consumidor: Analyzer
Exchange: `video.events`
Routing key: `video.uploaded.v1`
Queue: `video.analysis`

```json
{
  "videoId": "uuid",
  "storageKey": "videos/uuid/original.mp4",
  "objectVersion": "provider-version",
  "contentType": "video/mp4",
  "sizeBytes": 104857600
}
```

A versão do objeto é obrigatória e torna o input imutável mesmo se a mesma key receber outro upload. O evento é gravado via transactional outbox e pode ser entregue mais de uma vez com o mesmo `eventId`.

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
  "storageKey": "videos/uuid/original.mp4",
  "objectVersion": "provider-version"
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

- `eventId`, `eventType`, `eventVersion`, `occurredAt` e `correlationId` são obrigatórios;
- payloads externos são validados antes de Application/Domain;
- producer usa mensagem persistente e publisher confirm;
- consumers assumem at-least-once e são idempotentes;
- mensagens desconhecidas ou versões incompatíveis são rejeitadas de forma segura;
- provider-specific types, signed URLs e credenciais não atravessam boundaries;
- uma nova estrutura incompatível exige incremento de `eventVersion`.
