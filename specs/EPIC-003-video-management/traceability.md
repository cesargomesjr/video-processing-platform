# Traceability — EPIC-003 — Video Management

| Requirement | Primary tasks | Automated evidence |
|---|---|---|
| E3-FR-001 Create upload | E3-TASK-001, E3-TASK-002, E3-TASK-003, E3-TASK-009 | domain/use-case unit + MinIO integration + create E2E |
| E3-FR-002 External private storage | E3-TASK-002, E3-TASK-007, E3-TASK-010 | MinIO privacy/versioning integration + Compose smoke |
| E3-FR-003 Confirm upload | E3-TASK-001, E3-TASK-004, E3-TASK-006, E3-TASK-007, E3-TASK-009 | confirm unit + PostgreSQL/MinIO integration + E2E |
| E3-FR-004 List own videos | E3-TASK-005, E3-TASK-006, E3-TASK-009 | repository integration + two-user E2E |
| E3-FR-005 Detail/status | E3-TASK-005, E3-TASK-006, E3-TASK-009 | use-case unit + own/foreign E2E |
| E3-SEC-001 Authenticated ownership | E3-TASK-004, E3-TASK-005, E3-TASK-009 | two-user create/list/detail/confirm E2E |
| E3-SEC-002 Upload constraints | E3-TASK-001, E3-TASK-003, E3-TASK-007, E3-TASK-009 | value-object unit + MinIO mismatch integration + HTTP E2E |
| E3-NFR-001 Idempotent confirmation | E3-TASK-004, E3-TASK-006 | concurrent PostgreSQL integration + repeated-confirm E2E |
| E3-NFR-002 Reliable publication | E3-TASK-006, E3-TASK-008 | transaction rollback + RabbitMQ failure/retry/confirm integration |
| E3-NFR-003 Deterministic listing | E3-TASK-005, E3-TASK-006, E3-TASK-009 | cursor unit + equal-timestamp repository integration + E2E |
| E3-NFR-004 Operational readiness | E3-TASK-010 | dependency health integration + Compose smoke |

## Global artifacts affected

- `docs/architecture/api-contracts.md`;
- `docs/architecture/data-model.md`;
- `docs/architecture/event-catalog.md`;
- `docs/architecture/storage-layout.md`;
- `docs/runbooks/local-development.md` during implementation;
- root requirements matrix when evidence exists.

Update this matrix if implementation changes task IDs or automated test locations. Gate 3 requires concrete test paths and results, not only categories.
