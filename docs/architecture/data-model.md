# Modelo de Dados

## ER

```mermaid
erDiagram
    USERS ||--o{ VIDEOS : owns
    VIDEOS ||--o{ VIDEO_PROCESSING_CHUNKS : contains
    VIDEOS ||--o{ OUTBOX_MESSAGES : emits

    USERS {
        uuid id PK
        varchar firebase_uid UK
        varchar email
        boolean email_verified
        timestamp created_at
        timestamp updated_at
    }

    VIDEOS {
        uuid id PK
        uuid user_id FK
        varchar original_filename
        varchar declared_content_type
        bigint declared_size_bytes
        varchar storage_key UK
        varchar object_version
        varchar verified_content_type
        bigint verified_size_bytes
        varchar etag
        varchar status
        numeric progress
        timestamp upload_expires_at
        timestamp uploaded_at
        integer duration_seconds
        integer fps
        integer total_chunks
        integer completed_chunks
        varchar result_storage_key
        text error_message
        timestamp created_at
        timestamp updated_at
        timestamp started_at
        timestamp completed_at
    }

    OUTBOX_MESSAGES {
        uuid id PK
        uuid aggregate_id
        varchar aggregate_type
        varchar event_type
        integer event_version
        uuid correlation_id
        jsonb payload
        integer attempts
        timestamp available_at
        timestamp locked_until
        timestamp published_at
        text last_error
        timestamp occurred_at
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
AWAITING_UPLOAD
PENDING
ANALYZING
PROCESSING
AGGREGATING
COMPLETED
FAILED
```

EPIC-003 entrega `AWAITING_UPLOAD -> PENDING`. Os épicos seguintes adicionam as demais transições sem redefinir o significado dos estados existentes.

## Status de Chunk

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

## Regras

- `users.firebase_uid` é obrigatório e único;
- `users.email` pode ser nulo e possui índice único parcial quando preenchido;
- a aplicação não persiste senha ou Firebase ID Token;
- `videos.user_id` referencia o `UserId` interno, nunca `firebase_uid`;
- `videos.storage_key` é determinística e única;
- metadata verificada e `uploaded_at` são nulos em `AWAITING_UPLOAD` e obrigatórios a partir de `PENDING`;
- `progress` é nulo quando indisponível e, quando preenchido, permanece entre 0 e 100;
- índice `(user_id, created_at DESC, id DESC)` sustenta listagem keyset;
- único `(aggregate_id, event_type, event_version)` impede duas intenções `VideoUploaded.v1`;
- outbox publicado somente após publisher confirm;
- `UNIQUE(video_id, sequence)`;
- `completed_chunks <= total_chunks`;
- um chunk completo não pode ser processado novamente;
- agregação requer todos os chunks completos;
- apenas uma execução pode promover `PROCESSING -> AGGREGATING`.
