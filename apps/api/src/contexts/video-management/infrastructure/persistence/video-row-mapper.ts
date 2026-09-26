import {
  Video,
  type VideoProperties,
  type VideoStatus,
} from '../../domain/video.js';
import { VideoId, VideoOwnerId } from '../../domain/video-id.js';
import type { SupportedVideoContentType } from '../../domain/video-upload-metadata.js';

const STATUSES = new Set<VideoStatus>([
  'AWAITING_UPLOAD',
  'PENDING',
  'ANALYZING',
  'PROCESSING',
  'AGGREGATING',
  'COMPLETED',
  'FAILED',
]);
const CONTENT_TYPES = new Set<SupportedVideoContentType>([
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/webm',
]);

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string')
    throw new Error(`Invalid video row field ${key}`);
  return value;
}

function nullableString(value: unknown, key: string): string | null {
  if (value === null || typeof value === 'string') return value;
  throw new Error(`Invalid video row field ${key}`);
}

function nullableDate(value: unknown, key: string): Date | null {
  if (value === null || value instanceof Date) return value;
  throw new Error(`Invalid video row field ${key}`);
}

export function videoFromRow(value: unknown): Video {
  if (typeof value !== 'object' || value === null)
    throw new Error('PostgreSQL returned an invalid video row');
  const row = value as Record<string, unknown>;
  const statusValue = stringField(row, 'status');
  if (!STATUSES.has(statusValue as VideoStatus))
    throw new Error('Invalid video row field status');
  const status = statusValue as VideoStatus;
  const contentTypeValue = stringField(row, 'declared_content_type');
  if (!CONTENT_TYPES.has(contentTypeValue as SupportedVideoContentType))
    throw new Error('Invalid video row field declared_content_type');
  const declaredContentType = contentTypeValue as SupportedVideoContentType;
  const createdAt = row.created_at;
  const updatedAt = row.updated_at;
  const uploadExpiresAt = row.upload_expires_at;
  if (
    !(createdAt instanceof Date) ||
    !(updatedAt instanceof Date) ||
    !(uploadExpiresAt instanceof Date)
  )
    throw new Error('Invalid video row timestamps');
  const progress = row.progress === null ? null : Number(row.progress);
  const properties: VideoProperties = {
    id: VideoId.create(stringField(row, 'id')),
    ownerId: VideoOwnerId.create(stringField(row, 'user_id')),
    originalFilename: stringField(row, 'original_filename'),
    declaredContentType,
    declaredSizeBytes: Number(row.declared_size_bytes),
    storageKey: stringField(row, 'storage_key'),
    objectVersion: nullableString(row.object_version, 'object_version'),
    etag: nullableString(row.etag, 'etag'),
    verifiedContentType: nullableString(
      row.verified_content_type,
      'verified_content_type',
    ),
    verifiedSizeBytes:
      row.verified_size_bytes === null ? null : Number(row.verified_size_bytes),
    status,
    progress,
    uploadExpiresAt,
    uploadedAt: nullableDate(row.uploaded_at, 'uploaded_at'),
    createdAt,
    updatedAt,
  };
  return Video.restore(properties);
}

export const VIDEO_COLUMNS = `
  id, user_id, original_filename, declared_content_type, declared_size_bytes,
  storage_key, object_version, verified_content_type, verified_size_bytes,
  etag, status, progress, upload_expires_at, uploaded_at, created_at, updated_at
`;
