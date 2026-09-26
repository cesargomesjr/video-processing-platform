import type { Pool } from 'pg';
import {
  VideoConfirmationUnitOfWork,
  type VideoUploadedEvent,
} from '../../application/ports/video-ports.js';
import type { Video } from '../../domain/video.js';

export class PostgresVideoConfirmationUnitOfWork extends VideoConfirmationUnitOfWork {
  public constructor(private readonly pool: Pool) {
    super();
  }

  public override async confirm(
    video: Video,
    event: VideoUploadedEvent,
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const p = video.snapshot;
      const updated = await client.query(
        `UPDATE videos SET status = $1, object_version = $2, etag = $3,
          verified_content_type = $4, verified_size_bytes = $5,
          uploaded_at = $6, updated_at = $6
         WHERE id = $7 AND user_id = $8 AND status = 'AWAITING_UPLOAD'
         RETURNING id`,
        [
          p.status,
          p.objectVersion,
          p.etag,
          p.verifiedContentType,
          p.verifiedSizeBytes,
          p.uploadedAt,
          p.id.toString(),
          p.ownerId.toString(),
        ],
      );
      if (updated.rowCount !== 1) {
        await client.query('ROLLBACK');
        return false;
      }
      await client.query(
        `INSERT INTO outbox_messages (
          id, aggregate_id, aggregate_type, event_type, event_version,
          correlation_id, payload, available_at, occurred_at
        ) VALUES ($1,$2,'Video',$3,$4,$5,$6,$7,$7)`,
        [
          event.eventId,
          event.payload.videoId,
          event.eventType,
          event.eventVersion,
          event.correlationId,
          JSON.stringify(event.payload),
          event.occurredAt,
        ],
      );
      await client.query('COMMIT');
      return true;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
