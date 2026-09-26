# Traceability — EPIC-003 — Video Management

| Requirement | Primary tasks | Evidence |
|---|---|---|
| E3-FR-001 Create upload | E3-TASK-001, E3-TASK-002, E3-TASK-003, E3-TASK-009 | `apps/api/src/contexts/video-management/domain/video.spec.ts`; `apps/api/src/contexts/video-management/application/use-cases/video-use-cases.spec.ts`; `apps/api/test/video.e2e-spec.ts`; Compose smoke with signed MinIO PUT |
| E3-FR-002 External private storage | E3-TASK-002, E3-TASK-007, E3-TASK-010 | `apps/api/src/contexts/video-management/application/use-cases/video-use-cases.spec.ts`; `apps/api/test/video.e2e-spec.ts`; Compose smoke confirmed direct PUT to MinIO and no binary payload through API |
| E3-FR-003 Confirm upload | E3-TASK-001, E3-TASK-004, E3-TASK-006, E3-TASK-007, E3-TASK-009 | `apps/api/src/contexts/video-management/domain/video.spec.ts`; `apps/api/src/contexts/video-management/application/use-cases/video-use-cases.spec.ts`; `apps/api/test/video.e2e-spec.ts`; Compose smoke verified `PENDING` and outbox publication |
| E3-FR-004 List own videos | E3-TASK-005, E3-TASK-006, E3-TASK-009 | `apps/api/src/contexts/video-management/application/use-cases/video-use-cases.spec.ts`; `apps/api/test/video.e2e-spec.ts` |
| E3-FR-005 Detail/status | E3-TASK-005, E3-TASK-006, E3-TASK-009 | `apps/api/src/contexts/video-management/application/use-cases/video-use-cases.spec.ts`; `apps/api/test/video.e2e-spec.ts` |
| E3-SEC-001 Authenticated ownership | E3-TASK-004, E3-TASK-005, E3-TASK-009 | `apps/api/test/video.e2e-spec.ts`; ownership always comes from `AuthenticatedRequest` principal in `video.controller.ts` |
| E3-SEC-002 Upload constraints | E3-TASK-001, E3-TASK-003, E3-TASK-007, E3-TASK-009 | `apps/api/src/contexts/video-management/domain/video-upload-metadata.spec.ts`; `apps/api/test/video.e2e-spec.ts` |
| E3-NFR-001 Idempotent confirmation | E3-TASK-004, E3-TASK-006 | `apps/api/src/contexts/video-management/application/use-cases/video-use-cases.spec.ts`; `apps/api/test/video.e2e-spec.ts`; Compose smoke with repeated/concurrent confirmation |
| E3-NFR-002 Reliable publication | E3-TASK-006, E3-TASK-008 | `apps/api/src/contexts/video-management/application/use-cases/dispatch-outbox.spec.ts`; `apps/api/src/platform/database/database-migration-runner.spec.ts`; Compose smoke with RabbitMQ outage/recovery |
| E3-NFR-003 Deterministic listing | E3-TASK-005, E3-TASK-006, E3-TASK-009 | `apps/api/src/contexts/video-management/presentation/http/video-cursor.spec.ts`; `apps/api/test/video.e2e-spec.ts` |
| E3-NFR-004 Operational readiness | E3-TASK-010 | `apps/api/src/platform/health/application/get-readiness.spec.ts`; `apps/api/test/health.e2e-spec.ts`; `curl -fsS http://127.0.0.1:3020/health/ready` |

## Global artifacts affected

- `docs/architecture/api-contracts.md`;
- `docs/architecture/data-model.md`;
- `docs/architecture/event-catalog.md`;
- `docs/architecture/storage-layout.md`;
- `docs/runbooks/local-development.md` during implementation;
- root requirements matrix when evidence exists.

Gate 3 evidence was recorded on 2026-09-26 in `acceptance.md`. Compose smoke is intentionally tracked as runtime evidence because it exercises PostgreSQL, MinIO and RabbitMQ with real containers.
