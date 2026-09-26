# Testing — EPIC-003 — Video Management

## Strategy

New behavior follows `RED -> GREEN -> REFACTOR`. Test doubles drive Domain/Application. Real PostgreSQL, MinIO and RabbitMQ appear only in integration/smoke suites with isolated state.

## Unit

### Domain

- creation and immutable ownership;
- filename, content type and size value objects;
- `AWAITING_UPLOAD -> PENDING`;
- repeated confirmation semantics;
- invalid state and verified metadata invariants.

### Application

- signed upload orchestration and failure ordering;
- owner-scoped confirmation;
- object absence, mismatch and storage unavailability;
- one logical event across repeated confirmation;
- list/detail scoping and pagination rules;
- outbox dispatch success, retry and stable event ID.

### Presentation

- strict body/path/query validation;
- cursor encode/decode;
- error-to-HTTP mapping;
- authenticated principal translation;
- correlation ID validation/generation.

Unit tests MUST NOT use real DB, broker, storage, Firebase or network.

## PostgreSQL integration

- migration forward and repeat execution;
- constraints/checks/index-backed queries;
- entity mapping;
- keyset pagination with equal timestamps;
- cross-user query isolation;
- transaction rollback;
- two concurrent confirmations result in one transition/outbox row;
- concurrent dispatchers cannot hold the same active lease;
- expired lease becomes claimable.

Each test uses rollback, schema isolation or deterministic cleanup. Arbitrary sleeps are forbidden.

## MinIO integration

- bucket private and versioning enabled;
- signed PUT succeeds with required content type;
- anonymous read fails;
- stat returns expected version/etag/size/type;
- missing object and provider failure are translated;
- overwrite creates a new version while confirmed event retains the selected version.

## RabbitMQ integration

- exchange, queue and binding are durable/idempotently declared;
- published message is persistent and reaches `video.analysis`;
- publisher confirm is required before marking outbox published;
- broker failure leaves outbox pending;
- retry reuses `eventId` and payload;
- duplicate delivery assumption is documented and observable.

## E2E

- authenticated creation returns `201`, `AWAITING_UPLOAD` and upload instruction;
- invalid media metadata creates nothing;
- upload plus confirmation returns `200 PENDING`;
- repeated/concurrent confirmation emits one logical outbox event;
- missing object returns `409` without changing status;
- two users cannot list, detail or confirm one another's videos;
- list pagination is stable and bounded;
- invalid token remains `401` through the EPIC-002 guard;
- readiness reflects PostgreSQL, MinIO and RabbitMQ.

## Compose smoke

```text
create Firebase emulator user
PUT /auth/me
POST /videos
PUT bytes through signed URL
POST /videos/:videoId/upload-completed
GET /videos/:id
assert one VideoUploaded.v1 in durable video.analysis queue
```

Smoke data is deleted after verification. Secrets and signed URLs are not printed.

## Quality gate

```text
lines      >= 80%
statements >= 80%
functions  >= 80%
branches   >= 80%
```

Additionally:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:cov
npm run build
docker compose config --quiet
```

No command is reported as passing unless executed. Bug fixes include regression tests when technically reasonable.
