# ADR-011 — Transactional Outbox for Integration Events

## Status

Accepted

## Context

Video Management must change PostgreSQL state and notify asynchronous processing. A database commit followed by a direct RabbitMQ publish has a failure window that can leave a confirmed video permanently unprocessed. RabbitMQ delivery is at-least-once, so duplicate publication is also possible.

## Decision

Persist the aggregate change and integration-event intent in a PostgreSQL transactional outbox.

- one transaction promotes the video and inserts the event envelope;
- a separate dispatcher claims outbox rows with a recoverable lease;
- publication uses persistent messages, durable topology and publisher confirms;
- `published_at` is written only after broker confirmation;
- retry preserves `eventId` and payload;
- consumers remain idempotent because publish-then-crash can duplicate delivery;
- event-specific uniqueness prevents duplicate logical intents for the same aggregate transition.

## Consequences

### Positive

- removes the DB/broker dual-write loss window;
- broker downtime does not invalidate a completed user request;
- supports multiple API replicas and recoverable dispatcher crashes;
- provides explicit operational state for pending publication.

### Negative

- publication is eventually consistent;
- adds schema, dispatcher lifecycle, cleanup and monitoring needs;
- duplicates remain possible and consumers must tolerate them;
- requires retention policy and operational visibility, completed in EPIC-007.

## Alternatives rejected

- publish directly after database commit: can lose notification permanently;
- publish before commit: consumers can observe state that later rolls back;
- distributed transaction/2PC: RabbitMQ/PostgreSQL coupling and complexity are not justified;
- treat publisher confirm as exactly-once: confirm cannot close the crash window before marking the outbox row.
