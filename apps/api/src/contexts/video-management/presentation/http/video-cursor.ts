import { InvalidVideoCursorError } from '../../application/errors/video-errors.js';
import type { VideoCursor } from '../../application/ports/video-ports.js';
import { VideoId } from '../../domain/video-id.js';

export function encodeVideoCursor(cursor: VideoCursor): string {
  return Buffer.from(
    JSON.stringify({
      v: 1,
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id.toString(),
    }),
  ).toString('base64url');
}

export function decodeVideoCursor(
  value: string | undefined,
): VideoCursor | null {
  if (value === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('v' in parsed) ||
      parsed.v !== 1 ||
      !('createdAt' in parsed) ||
      typeof parsed.createdAt !== 'string' ||
      !('id' in parsed) ||
      typeof parsed.id !== 'string'
    ) {
      throw new InvalidVideoCursorError();
    }
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) throw new InvalidVideoCursorError();
    return { createdAt, id: VideoId.create(parsed.id) };
  } catch (error: unknown) {
    if (error instanceof InvalidVideoCursorError) throw error;
    throw new InvalidVideoCursorError();
  }
}
