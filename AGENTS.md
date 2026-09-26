# AGENTS.md

## Role

Act as a Senior TypeScript Backend Engineer and Software Architect.

Prioritize:

- readable code
- explicit business behavior
- Clean Architecture
- SOLID
- pragmatic DDD
- TDD
- testability
- maintainability
- security
- observability
- performance

Do not optimize only for code that works.
Optimize for code that is easy to understand, test, evolve, and operate.

---

# Project

FIAP X distributed video-processing platform.

Main stack:

- TypeScript
- Node.js
- NestJS
- PostgreSQL
- RabbitMQ
- FFmpeg / ffprobe
- Object Storage
- Docker
- Jest
- OpenTelemetry / Prometheus when applicable

The system processes videos asynchronously using:

```text
Video Upload
→ Analysis
→ Chunking
→ Parallel Processing
→ Aggregation
→ ZIP
→ Download
```

Processing MUST support retries, concurrency and idempotency.

---

# Development principles

Use:

Clean Architecture + SOLID + pragmatic DDD + TDD.

Prefer simple and explicit code over clever abstractions.

Changes MUST be:

- small
- cohesive
- testable
- reviewable
- reversible

Do not refactor unrelated code while implementing a feature.

---

# Clean Architecture

Dependencies MUST point inward.

```text
main
 ├── presentation
 │      ↓
 │   application
 │      ↓
 │    domain
 │
 └── infrastructure
        ↓
 application/domain contracts
```

Expected source organization:

```text
src/
├── contexts/
│   └── <context>/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── presentation/
│
├── platform/
└── main/
```

Use bounded contexts only when there is a real domain boundary.

Likely contexts include:

```text
identity
video-management
video-processing
notification
```

Do NOT create contexts or abstractions for hypothetical future requirements.

---

# Domain

Domain contains pure business behavior:

```text
entities
value objects
domain errors
invariants
domain policies
domain services when justified
```

Domain MUST NOT depend on:

```text
NestJS
HTTP
RabbitMQ
FFmpeg
PostgreSQL
ORMs
filesystem
cloud SDKs
process.env
infrastructure
presentation
```

Business invariants MUST live in domain/application code, never only in controllers.

Examples:

```text
a completed chunk cannot be processed again
a video cannot be aggregated before all chunks complete
a user cannot access another user's video
invalid processing state transitions must fail
```

---

# Application

Application contains:

```text
use cases
ports
repository contracts
DTOs
orchestration
transaction boundaries
```

Use cases MUST be small, explicit and independently testable.

Application MUST depend on capabilities, not providers.

Prefer:

```text
VideoStorage
VideoProcessor
MessagePublisher
VideoRepository
ChunkRepository
NotificationGateway
```

instead of:

```text
S3Client
RabbitMQClient
FFmpegService
PrismaClient
```

Provider-specific implementations belong to infrastructure.

---

# Infrastructure

Infrastructure implements application/domain ports.

Examples:

```text
PostgresVideoRepository
RabbitMQMessagePublisher
FFmpegVideoProcessor
S3VideoStorage
EmailNotificationGateway
```

Infrastructure MUST NOT leak:

```text
ORM entities
database models
RabbitMQ payload types
cloud SDK types
provider-specific errors
```

into application or domain.

Map external errors at adapter boundaries.

---

# Presentation

Controllers and message consumers are transport adapters.

They SHOULD only:

```text
receive input
validate transport data
map input
call a use case
map output/error
```

Forbidden:

```text
Controller -> Database
Controller -> ORM
Controller -> FFmpeg
Controller -> RabbitMQ
Controller -> Cloud SDK
```

Expected:

```text
Controller / Consumer
        ↓
     Use Case
        ↓
       Port
        ↓
Infrastructure Adapter
```

Controllers MUST remain thin.

---

# Main

`main` is the composition root.

It may:

```text
bootstrap the application
configure dependency injection
bind ports to adapters
register consumers/controllers
load configuration
```

Business rules MUST NOT exist in `main`.

---

# DDD

Use DDD pragmatically.

Use:

```text
Entity
```

when identity and lifecycle matter.

Use:

```text
Value Object
```

when validation or semantics matter.

Use:

```text
Domain Service
```

only when a business rule cannot naturally belong to an entity/value object.

Use:

```text
Domain Error
```

for business violations.

Avoid unnecessary:

```text
aggregates
factories
generic repositories
domain events
abstraction layers
```

Naming MUST reflect the ubiquitous language.

Prefer:

```ts
markChunkAsCompleted();
startVideoProcessing();
scheduleVideoChunks();
completeVideoProcessing();
```

Avoid:

```ts
process();
handle();
doAction();
updateData();
```

Readable code is a design requirement.

---

# SOLID

Apply SOLID pragmatically.

Rules:

```text
one coherent responsibility per component
dependency inversion through ports
small purpose-specific interfaces
constructor injection
composition over inheritance
explicit dependencies
minimal side effects
```

Avoid:

```text
God services
service locator
large generic interfaces
boolean flags changing entire behaviors
premature abstraction
```

---

# TypeScript

Use strict TypeScript.

Do NOT use:

```ts
any
as any
@ts-ignore
```

unless an external boundary makes it unavoidable and the value is immediately narrowed.

Prefer:

```ts
unknown
```

for untrusted input.

Public methods SHOULD expose explicit return types.

Type casting is not validation.

External input MUST be validated before entering application/domain behavior.

---

# Video processing

Node.js orchestrates processing.

FFmpeg performs CPU-intensive video work.

Do NOT implement video decoding or frame manipulation loops directly in JavaScript when FFmpeg can perform the operation.

Processing flow:

```text
VideoUploaded
    ↓
Analyzer
    ↓
Orchestrator
    ↓
ProcessVideoChunk × N
    ↓
Workers
    ↓
ChunkCompleted
    ↓
Aggregator
    ↓
VideoCompleted
```

Chunk processing MUST consider:

```text
idempotency
retry
DLQ
concurrency
atomic state transitions
duplicate messages
worker crashes
partial failures
```

Never assume queue messages are delivered exactly once.

Consumers MUST be idempotent.

Example:

```text
if chunk.status == COMPLETED
    ACK
    return
```

Concurrency-sensitive state transitions MUST preferably be protected at persistence level.

---

# Testing

Development follows TDD for business behavior.

```text
RED
 ↓
GREEN
 ↓
REFACTOR
```

For new behavior:

```text
write failing test
confirm expected failure
implement minimum solution
make test pass
refactor
run full verification
```

Every meaningful use case MUST have unit tests.

Business tests MUST NOT depend on:

```text
real database
real RabbitMQ
real storage
real network
real FFmpeg process
external APIs
```

Use fakes/stubs/mocks at boundaries.

Prefer behavior tests over implementation-detail tests.

Do NOT test private methods.

---

# Test strategy

Maintain a balanced test pyramid.

```text
            E2E
           /   \
      Integration
       /       \
        Unit Tests
```

Unit tests:

```text
domain rules
value objects
use cases
chunk calculation
state transitions
progress calculation
idempotency
authorization
```

Integration tests:

```text
PostgreSQL repositories
RabbitMQ adapters
Object Storage adapters
FFmpeg adapter
```

E2E tests:

```text
authentication
upload
processing
status
aggregation
download
failure/retry
```

---

# Coverage

Automated test coverage MUST remain above 80%.

Minimum expected threshold:

```text
lines      >= 80%
statements >= 80%
functions  >= 80%
branches   >= 80%
```

Coverage is a quality gate, not the objective.

Do NOT:

```text
write meaningless tests only to increase coverage
test getters/setters without behavior
weaken assertions
remove failing tests
skip tests without justification
mock the behavior being tested
```

Critical domain and application behavior SHOULD target significantly higher coverage than the global minimum.

---

# Bug fixes

Whenever practical:

```text
reproduce bug
    ↓
write failing regression test
    ↓
implement fix
    ↓
verify regression test
```

A bug fix without a regression test requires justification.

---

# Security

Authorization MUST be enforced server-side.

Always consider:

```text
authentication
resource ownership
IDOR
input validation
file type
file size
signed URL expiration
secret exposure
```

Never log:

```text
passwords
tokens
authorization headers
credentials
secrets
```

---

# Observability

Use structured logs.

Propagate when available:

```text
correlationId
traceId
videoId
chunkId
messageId
```

Important operations SHOULD expose metrics for:

```text
processing duration
failed videos
processed videos
failed chunks
queue depth
active workers
retry count
```

---

# Workflow

Before coding:

```text
understand requirement
inspect relevant code
inspect related tests
identify affected layers
identify domain rules
identify concurrency/security impact
```

During implementation:

```text
test first
implement smallest compliant behavior
respect architecture boundaries
avoid unrelated refactoring
```

After implementation:

```text
lint
typecheck
tests
coverage
build
```

Never claim a command passed unless it was actually executed.

---

# Verification

Run the equivalent available commands:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:cov
npm run build
```

Before declaring completion verify:

```text
lint passes
typecheck passes
tests pass
coverage >= 80%
build passes
```

If something cannot run, report:

```text
command
reason
impact
```

---

# Definition of Done

A task is complete only when:

```text
business behavior is explicit
architecture boundaries are preserved
SOLID is respected
domain invariants are protected
code remains readable
tests cover new behavior
coverage remains >= 80%
lint passes
typecheck passes
tests pass
build passes
security implications were considered
concurrency/idempotency were considered when applicable
no unrelated refactor was introduced
```

---

# Architectural red flags

Stop and reconsider if you find:

```text
controller -> database
controller -> FFmpeg
controller -> RabbitMQ

use case -> ORM
use case -> NestJS
use case -> process.env

domain -> infrastructure
domain -> NestJS
domain -> HTTP
domain -> RabbitMQ
domain -> FFmpeg

business rule only in controller

queue consumer without idempotency

concurrency-sensitive update without atomic protection

new business behavior without tests

coverage below 80%
```

---

# Decision rule

When multiple solutions are valid, prefer the one that:

```text
makes business behavior explicit
keeps dependency direction inward
is easier to read
is easier to test
reduces coupling
introduces fewer concepts
minimizes side effects
has smaller blast radius
is easier to reverse
```

---

# Golden Rule

```text
Readable code
+ explicit business rules
+ tests
+ simple design
+ architecture preservation
+ verification
```

No task is complete before verification.
