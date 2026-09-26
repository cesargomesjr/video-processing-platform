# Tasks — EPIC-003 — Video Management

Tasks follow `RED -> GREEN -> REFACTOR`. Unit tests do not use real PostgreSQL, MinIO, RabbitMQ or network.

## Execution order

```text
001 Domain
 ├─> 002 Application contracts
 ├─> 003 Create upload
 ├─> 004 Confirm upload
 └─> 005 Queries
002 -> 006 PostgreSQL
002 -> 007 MinIO
004 -> 008 Outbox/RabbitMQ
003..008 -> 009 HTTP/composition
006..008 -> 010 Provisioning/readiness
009..010 -> 011 E2E/evidence
```

## E3-TASK-001 — Model Video lifecycle

**Deliver**

- `Video`, `VideoId`, filename/content type/size value objects and statuses;
- creation in `AWAITING_UPLOAD`;
- confirmation to `PENDING` with verified object identity;
- idempotent state semantics and domain errors.

**Tests**

Creation invariants, allowed/rejected metadata, transition, repeated confirmation and progress behavior.

## E3-TASK-002 — Define application contracts

**Deliver**

- inputs/outputs for all use cases;
- `VideoRepository`, `VideoStorage`, `VideoConfirmationUnitOfWork`;
- `OutboxRepository`, `IntegrationEventPublisher`;
- ID/clock ports and provider-agnostic errors;
- `VideoUploaded.v1` application contract.

**Tests**

Typecheck plus architecture rules proving Domain/Application have no provider dependencies.

## E3-TASK-003 — Create video upload

**Deliver**

- `CreateVideoUpload`;
- policy validation before side effects;
- deterministic key and signed upload instruction;
- persistence scoped to authenticated `UserId`;
- failure behavior when signing or insertion fails.

**Tests**

Unit tests with fakes covering valid creation, unsupported type, filename, size limits and adapter failures.

## E3-TASK-004 — Confirm upload idempotently

**Deliver**

- `ConfirmVideoUpload`;
- owned lookup and indistinguishable not-found behavior;
- storage stat/version verification;
- conditional transition plus outbox through one transaction;
- reload behavior after concurrent/duplicate confirmation.

**Tests**

Unit tests for object absence/mismatch/provider failure and PostgreSQL integration with concurrent confirmations proving one event.

## E3-TASK-005 — List and get owned videos

**Deliver**

- `ListUserVideos` and `GetUserVideo`;
- opaque cursor codec at the presentation boundary;
- keyset query by `(createdAt, id)`;
- default/max limit and nullable progress.

**Tests**

Unit and repository integration for ordering, equal timestamps, page boundaries, invalid cursor and cross-user isolation.

## E3-TASK-006 — PostgreSQL schema and adapters

**Deliver**

- additive migration for `videos` and `outbox_messages`;
- constraints and indexes from `design.md`;
- mappings persistence <-> domain;
- transaction using conditional update and unique outbox key;
- outbox claim/lease/retry queries.

**Tests**

Integration against isolated PostgreSQL covering migration idempotency, mappings, constraints, rollback and concurrent claims.

## E3-TASK-007 — MinIO/S3-compatible adapter

**Deliver**

- signed PUT instruction with required header and bounded TTL;
- object stat returning version, etag, size and content type;
- provider errors translated to application errors;
- separate private operations endpoint and public signing endpoint;
- bucket versioning validation.

**Tests**

Integration against MinIO for upload, expiry configuration, private bucket, missing object, metadata and exact object version.

## E3-TASK-008 — Transactional outbox dispatcher and RabbitMQ

**Deliver**

- durable exchange/queue/binding from `outbox-policy.md`;
- persistent publication with publisher confirms;
- batch claim with lease and bounded retry;
- graceful shutdown;
- no raw broker/provider errors leaking inward.

**Tests**

Integration proving successful publish, retry after broker failure, stable event ID, duplicate-safe dispatch and recovery of expired lease.

## E3-TASK-009 — HTTP contracts and composition

**Deliver**

- authenticated `POST /videos`;
- authenticated `POST /videos/:videoId/upload-completed`;
- authenticated `GET /videos` and `GET /videos/:videoId`;
- strict DTO validation and standard errors;
- correlation ID generation/propagation;
- `main/modules/video-management.module.ts` composition.

**Tests**

Controller unit tests and E2E for response schemas, status codes, ownership, malformed input and idempotent confirmation.

## E3-TASK-010 — Local provisioning and readiness

**Deliver**

- MinIO and RabbitMQ services in Compose without public data/broker ports beyond local development need;
- idempotent bucket creation, private policy and versioning;
- idempotent RabbitMQ topology;
- validated configuration with production-safe defaults;
- readiness aggregation for PostgreSQL, MinIO and RabbitMQ;
- local runbook and smoke commands.

**Tests**

Compose config validation, health checks and smoke flow from signed upload through queued `VideoUploaded.v1`.

## E3-TASK-011 — Quality and evidence

**Deliver**

- required integration suites isolated from shared state;
- all Gherkin scenarios represented by automated evidence;
- API/data/event/storage documents synchronized;
- traceability and acceptance updated with commands/results;
- no secrets, URLs or tokens in logs/fixtures.

**Required commands**

```bash
npm run lint
npm run typecheck
npm run test
npm run test:cov
npm run build
docker compose config --quiet
```
