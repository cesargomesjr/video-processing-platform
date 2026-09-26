# Transactional Outbox Policy — EPIC-003

## Guarantee

`Video.status = PENDING` and the intent to publish `VideoUploaded.v1` are committed in the same PostgreSQL transaction. The system guarantees at-least-once publication, not exactly-once delivery.

## Event envelope

```json
{
  "eventId": "uuid",
  "eventType": "VideoUploaded",
  "eventVersion": 1,
  "occurredAt": "ISO-8601",
  "correlationId": "uuid",
  "payload": {
    "videoId": "uuid",
    "storageKey": "videos/uuid/original.mp4",
    "objectVersion": "provider-version",
    "contentType": "video/mp4",
    "sizeBytes": 104857600
  }
}
```

The event contains no filename, email, Firebase UID, signed URL or storage credential.

## PostgreSQL record

Minimum fields:

- `id` equals stable `eventId`;
- aggregate ID/type;
- event type/version;
- occurred/correlation IDs;
- JSON payload serialized from a validated application event;
- `attempts`, `available_at`, `locked_until`, `published_at`;
- sanitized `last_error` for operation, never raw credentials or message payload.

Unique `(aggregate_id, event_type, event_version)` enforces one `VideoUploaded.v1` per video.

## Dispatcher

- claims a configurable batch using `FOR UPDATE SKIP LOCKED`;
- lease prevents concurrent dispatchers from owning the same row indefinitely;
- publishes with `deliveryMode = 2` to durable exchange `video.events`;
- uses routing key `video.uploaded.v1`;
- waits for publisher confirm before `published_at`;
- retains the same event ID and payload on every retry;
- applies bounded exponential backoff with jitter;
- expired lease makes work recoverable after process crash.

The dispatcher may publish and crash before marking the row. This produces a duplicate by design; EPIC-004 consumers deduplicate by `eventId` or idempotent aggregate state.

## RabbitMQ topology introduced here

- durable topic exchange: `video.events`;
- durable queue: `video.analysis`;
- binding: `video.uploaded.v1`;
- persistent messages;
- manual consumer acknowledgement, retry queues and DLQ are completed with the Analyzer in EPIC-004.

Provisioning is idempotent. The queue exists before the first publication so events accumulate safely even before the Analyzer is deployed.

## Shutdown and readiness

- dispatcher stops claiming new rows during shutdown and lets in-flight publish finish within a bounded grace period;
- RabbitMQ participates in readiness;
- broker downtime does not make a previously confirmed upload disappear;
- unpublished rows remain queryable for operational diagnosis without exposing payload secrets.
