import type { SqlClient } from '../../../../platform/database/sql-client.js';
import {
  VideoRepository,
  type VideoCursor,
  type VideoPage,
} from '../../application/ports/video-ports.js';
import type { Video } from '../../domain/video.js';
import type { VideoId, VideoOwnerId } from '../../domain/video-id.js';
import { VIDEO_COLUMNS, videoFromRow } from './video-row-mapper.js';

export class PostgresVideoRepository extends VideoRepository {
  public constructor(private readonly sqlClient: SqlClient) {
    super();
  }

  public override async create(video: Video): Promise<void> {
    const p = video.snapshot;
    await this.sqlClient.query(
      `
      INSERT INTO videos (
        id, user_id, original_filename, declared_content_type,
        declared_size_bytes, storage_key, status, progress,
        upload_expires_at, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
    `,
      [
        p.id.toString(),
        p.ownerId.toString(),
        p.originalFilename,
        p.declaredContentType,
        p.declaredSizeBytes,
        p.storageKey,
        p.status,
        p.progress,
        p.uploadExpiresAt,
        p.createdAt,
      ],
    );
  }

  public override async findOwnedById(
    ownerId: VideoOwnerId,
    videoId: VideoId,
  ): Promise<Video | null> {
    const result = await this.sqlClient.query(
      `SELECT ${VIDEO_COLUMNS} FROM videos WHERE id = $1 AND user_id = $2`,
      [videoId.toString(), ownerId.toString()],
    );
    return result.rows[0] === undefined ? null : videoFromRow(result.rows[0]);
  }

  public override async listOwned(
    ownerId: VideoOwnerId,
    limit: number,
    cursor: VideoCursor | null,
  ): Promise<VideoPage> {
    const result =
      cursor === null
        ? await this.sqlClient.query(
            `SELECT ${VIDEO_COLUMNS} FROM videos WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`,
            [ownerId.toString(), limit + 1],
          )
        : await this.sqlClient.query(
            `SELECT ${VIDEO_COLUMNS} FROM videos WHERE user_id = $1 AND (created_at, id) < ($2, $3) ORDER BY created_at DESC, id DESC LIMIT $4`,
            [
              ownerId.toString(),
              cursor.createdAt,
              cursor.id.toString(),
              limit + 1,
            ],
          );
    const videos = result.rows.map(videoFromRow);
    const items = videos.slice(0, limit);
    const last = videos.length > limit ? items.at(-1) : undefined;
    return {
      items,
      nextCursor:
        last === undefined
          ? null
          : {
              createdAt: last.snapshot.createdAt,
              id: last.snapshot.id,
            },
    };
  }
}
