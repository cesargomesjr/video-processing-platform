import type { Pool } from 'pg';
import {
  OutboxRepository,
  type PendingOutboxMessage,
} from '../../application/ports/video-ports.js';

function toMessage(value: unknown): PendingOutboxMessage {
  if (typeof value !== 'object' || value === null)
    throw new Error('Invalid outbox row');
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== 'string' ||
    typeof row.event_type !== 'string' ||
    typeof row.event_version !== 'number' ||
    typeof row.attempts !== 'number' ||
    !(row.occurred_at instanceof Date) ||
    typeof row.correlation_id !== 'string' ||
    typeof row.payload !== 'object' ||
    row.payload === null
  ) {
    throw new Error('Invalid outbox row');
  }
  return {
    id: row.id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    occurredAt: row.occurred_at,
    attempts: row.attempts,
    correlationId: row.correlation_id,
    payload: row.payload as Readonly<Record<string, unknown>>,
  };
}

export class PostgresOutboxRepository extends OutboxRepository {
  public constructor(private readonly pool: Pool) {
    super();
  }

  public override async claim(
    batchSize: number,
    leaseUntil: Date,
  ): Promise<readonly PendingOutboxMessage[]> {
    const result = await this.pool.query(
      `
      UPDATE outbox_messages SET locked_until = $2
      WHERE id IN (
        SELECT id FROM outbox_messages
        WHERE published_at IS NULL AND available_at <= now()
          AND (locked_until IS NULL OR locked_until < now())
        ORDER BY occurred_at LIMIT $1 FOR UPDATE SKIP LOCKED
      )
      RETURNING id, event_type, event_version, occurred_at, attempts, correlation_id, payload
    `,
      [batchSize, leaseUntil],
    );
    return result.rows.map(toMessage);
  }

  public override async markPublished(
    id: string,
    publishedAt: Date,
  ): Promise<void> {
    await this.pool.query(
      'UPDATE outbox_messages SET published_at = $2, locked_until = NULL WHERE id = $1',
      [id, publishedAt],
    );
  }

  public override async scheduleRetry(
    id: string,
    availableAt: Date,
    safeError: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_messages SET attempts = attempts + 1, available_at = $2,
        locked_until = NULL, last_error = $3 WHERE id = $1`,
      [id, availableAt, safeError.slice(0, 255)],
    );
  }
}
