# Modelo de Dados

## ER

```mermaid
erDiagram
    USERS ||--o{ VIDEOS : owns
    VIDEOS ||--o{ VIDEO_PROCESSING_CHUNKS : contains

    USERS {
        uuid id PK
        varchar email
        varchar password_hash
        timestamp created_at
        timestamp updated_at
    }

    VIDEOS {
        uuid id PK
        uuid user_id FK
        varchar original_filename
        varchar storage_key
        varchar status
        integer duration_seconds
        integer fps
        integer total_chunks
        integer completed_chunks
        varchar result_storage_key
        text error_message
        timestamp created_at
        timestamp started_at
        timestamp completed_at
    }

    VIDEO_PROCESSING_CHUNKS {
        uuid id PK
        uuid video_id FK
        integer sequence
        integer start_time_seconds
        integer duration_seconds
        varchar status
        integer attempts
        varchar output_path
        text error_message
        timestamp created_at
        timestamp started_at
        timestamp completed_at
    }
```

## Status de Video

```text
PENDING
ANALYZING
PROCESSING
AGGREGATING
COMPLETED
FAILED
```

## Status de Chunk

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

## Regras

- `UNIQUE(video_id, sequence)`;
- `completed_chunks <= total_chunks`;
- um chunk completo não pode ser processado novamente;
- agregação requer todos os chunks completos;
- apenas uma execução pode promover `PROCESSING -> AGGREGATING`.
