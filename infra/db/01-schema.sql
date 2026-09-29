CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(320) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_email_format CHECK (position('@' in email) > 1)
);

DO $$
BEGIN
    CREATE TYPE video_status AS ENUM
        ('PENDING', 'ANALYZED', 'PROCESSING', 'AGGREGATING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS videos (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name VARCHAR(512) NOT NULL,
    format        VARCHAR(16)  NOT NULL,
    size_bytes    BIGINT       NOT NULL CHECK (size_bytes > 0),
    duration_ms   BIGINT       CHECK (duration_ms IS NULL OR duration_ms > 0),
    status        video_status NOT NULL DEFAULT 'PENDING',
    storage_key   VARCHAR(1024) NOT NULL,
    zip_key       VARCHAR(1024),
    frame_count   INTEGER      CHECK (frame_count IS NULL OR frame_count >= 0),
    error_reason  VARCHAR(512),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT videos_completed_requires_zip
        CHECK (status <> 'COMPLETED' OR zip_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_videos_owner_status ON videos (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_videos_status_created ON videos (status, created_at);
CREATE INDEX IF NOT EXISTS idx_videos_pending_rescan ON videos (updated_at)
    WHERE status IN ('PENDING', 'ANALYZED');

DO $$
BEGIN
    CREATE TYPE chunk_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS video_chunks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id     UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    chunk_index  INTEGER NOT NULL CHECK (chunk_index >= 0),
    start_ms     BIGINT  NOT NULL CHECK (start_ms >= 0),
    duration_ms  BIGINT  NOT NULL CHECK (duration_ms > 0),
    status       chunk_status NOT NULL DEFAULT 'PENDING',
    attempts     INTEGER NOT NULL DEFAULT 0,
    worker_id    VARCHAR(128),
    locked_until TIMESTAMPTZ,
    frame_count  INTEGER CHECK (frame_count IS NULL OR frame_count >= 0),
    error_reason VARCHAR(512),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT video_chunks_unique_index UNIQUE (video_id, chunk_index),
    CONSTRAINT video_chunks_completed_requires_frames
        CHECK (status <> 'COMPLETED' OR frame_count IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_chunks_video_status ON video_chunks (video_id, status);
CREATE INDEX IF NOT EXISTS idx_chunks_orphan_processing ON video_chunks (locked_until)
    WHERE status = 'PROCESSING';

CREATE TABLE IF NOT EXISTS notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id   UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel    VARCHAR(32) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    status     VARCHAR(16) NOT NULL DEFAULT 'SENT',
    sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT notifications_unique_event UNIQUE (video_id, event_type, channel)
);

CREATE TABLE IF NOT EXISTS outbox_messages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(64)  NOT NULL,
    aggregate_id   UUID         NOT NULL,
    event_type     VARCHAR(64)  NOT NULL,
    payload        JSONB        NOT NULL,
    published_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_unpublished ON outbox_messages (created_at)
    WHERE published_at IS NULL;
