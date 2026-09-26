# Arquitetura da Solução

## Visão geral

```mermaid
flowchart LR
    U[Usuário] --> F[Frontend]
    F --> API[API / BFF]

    API --> DB[(PostgreSQL)]
    API --> S[(Object Storage)]
    API --> MQ[(RabbitMQ)]

    MQ --> A[Analyzer]
    A --> O[Orchestrator]
    O --> MQ

    MQ --> W1[Worker]
    MQ --> W2[Worker]
    MQ --> WN[Worker N]

    W1 --> DB
    W2 --> DB
    WN --> DB

    W1 --> S
    W2 --> S
    WN --> S

    W1 --> MQ
    W2 --> MQ
    WN --> MQ

    MQ --> G[Aggregator]
    G --> DB
    G --> S
    G --> MQ

    MQ --> N[Notification]
```

## Separação de responsabilidades

### API

Responsável por:

- autenticação;
- autorização;
- ownership;
- criação do vídeo;
- emissão de evento;
- consultas;
- download assinado.

Não executa FFmpeg.

### Processor

Contém os entrypoints:

- Analyzer;
- Orchestrator;
- Worker;
- Aggregator.

Cada entrypoint pode escalar independentemente quando necessário.

### Notification

Consome eventos relevantes e chama provider externo.

## Clean Architecture

```mermaid
flowchart TD
    MAIN[main]
    PRES[presentation]
    APP[application]
    DOM[domain]
    INFRA[infrastructure]

    MAIN --> PRES
    MAIN --> INFRA
    PRES --> APP
    APP --> DOM
    INFRA --> APP
    INFRA --> DOM
```

### Domain

Pode conter:

- entities;
- value objects;
- domain errors;
- policies;
- invariants.

Não pode conhecer:

- NestJS;
- RabbitMQ;
- PostgreSQL;
- ORM;
- FFmpeg;
- storage SDK;
- HTTP.

### Application

Contém:

- use cases;
- ports;
- repository contracts;
- orchestration;
- transaction boundaries.

### Infrastructure

Implementa:

- repositories;
- RabbitMQ publisher/consumer;
- FFmpeg adapter;
- ffprobe adapter;
- Object Storage;
- providers.

### Presentation

Traduz:

- HTTP;
- message transport;
- validation;
- errors.

### Main

Configura:

- DI;
- modules;
- bootstrap;
- config;
- adapters.

## Estratégia de processamento

```mermaid
flowchart LR
    UP[VideoUploaded] --> ANA[Analyzer]
    ANA --> META[VideoAnalyzed]
    META --> ORC[Orchestrator]
    ORC --> C1[Chunk 1]
    ORC --> C2[Chunk 2]
    ORC --> CN[Chunk N]
    C1 --> W1[Worker]
    C2 --> W2[Worker]
    CN --> WN[Worker N]
    W1 --> FI[Fan-in]
    W2 --> FI
    WN --> FI
    FI --> AGG[Aggregator]
    AGG --> ZIP[ZIP]
```

## Estratégia de escala

Dois níveis:

1. **inter-video concurrency**: múltiplos vídeos simultâneos;
2. **intra-video concurrency**: múltiplos chunks de um mesmo vídeo.

## Garantias mínimas

- at-least-once delivery;
- idempotência;
- retry;
- DLQ;
- atomicidade em estados concorrentes;
- storage externo;
- logs correlacionáveis.
