# Requirements Traceability Matrix

| ID | Epic | Evidência principal |
|---|---|---|
| E1-AR-001 | Foundation | dependency-cruiser |
| E1-AR-002 | Foundation | structure review |
| E1-FR-001 | Foundation | liveness unit + E2E |
| E1-NFR-001 | Foundation | Jest coverage gate |
| E1-NFR-002 | Foundation | config unit tests |
| E1-OPS-001 | Foundation | container build + smoke |
| E1-OPS-002 | Foundation | CI/delivery workflows |
| E1-OPS-003 | Foundation | Compose config + smoke |
| E2-FR-001 | Identity | Authentication Emulator + E2E |
| E2-FR-002 | Identity | identity resolution unit/integration/E2E |
| E2-SEC-001 | Identity | protected route E2E |
| E2-SEC-002 | Identity | ownership unit + E2E |
| E2-SEC-003 | Identity | schema/config/log review |
| E2-NFR-001 | Identity | concurrent PostgreSQL integration |
| E2-OPS-001 | Identity | Compose config + smoke/E2E |
| E3-FR-001 | Video Management | create-upload unit + MinIO integration + E2E |
| E3-FR-002 | Video Management | private/versioned MinIO integration + smoke |
| E3-FR-003 | Video Management | confirmation unit + PostgreSQL/MinIO integration + E2E |
| E3-FR-004 | Video Management | paginated repository integration + two-user E2E |
| E3-FR-005 | Video Management | detail/status unit + ownership E2E |
| E3-SEC-001 | Video Management | two-user ownership E2E |
| E3-SEC-002 | Video Management | upload-policy unit/integration |
| E3-NFR-001 | Video Management | concurrent confirmation integration |
| E3-NFR-002 | Video Management | outbox transaction + RabbitMQ confirm/retry integration |
| E3-NFR-003 | Video Management | cursor unit + keyset integration |
| E3-NFR-004 | Video Management | readiness integration + Compose smoke |
| E4-FR-001 | Processing | ffprobe integration |
| E4-FR-002 | Processing | chunk policy unit tests |
| E4-NFR-001 | Processing | duplicate delivery tests |
| E4-NFR-002 | Processing | retry integration |
| E4-NFR-003 | Processing | DLQ integration |
| E5-FR-001 | Aggregation | fan-in unit/integration |
| E5-NFR-001 | Aggregation | concurrency test |
| E5-FR-003 | Aggregation | download E2E |
| E6-FR-001 | Notification | provider integration |
| E7-OBS-001 | Observability | log assertion/smoke |
| E7-OPS-001 | DevOps | observability/deployment pipeline |
