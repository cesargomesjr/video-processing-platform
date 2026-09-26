import type { Video, VerifiedVideoObject } from '../../domain/video.js';
import type { VideoId, VideoOwnerId } from '../../domain/video-id.js';

export type VideoCursor = Readonly<{
  createdAt: Date;
  id: VideoId;
}>;

export type VideoPage = Readonly<{
  items: readonly Video[];
  nextCursor: VideoCursor | null;
}>;

export abstract class VideoRepository {
  public abstract create(video: Video): Promise<void>;
  public abstract findOwnedById(
    ownerId: VideoOwnerId,
    videoId: VideoId,
  ): Promise<Video | null>;
  public abstract listOwned(
    ownerId: VideoOwnerId,
    limit: number,
    cursor: VideoCursor | null,
  ): Promise<VideoPage>;
}

export type SignedUpload = Readonly<{
  method: 'PUT';
  url: string;
  headers: Readonly<Record<string, string>>;
  expiresAt: Date;
}>;

export abstract class VideoStorage {
  public abstract createUpload(
    storageKey: string,
    contentType: string,
    expiresAt: Date,
  ): Promise<SignedUpload>;
  public abstract statObject(storageKey: string): Promise<VerifiedVideoObject>;
}

export type VideoUploadedEvent = Readonly<{
  eventId: string;
  eventType: 'VideoUploaded';
  eventVersion: 1;
  occurredAt: Date;
  correlationId: string;
  payload: Readonly<{
    videoId: string;
    storageKey: string;
    objectVersion: string;
    contentType: string;
    sizeBytes: number;
  }>;
}>;

export abstract class VideoConfirmationUnitOfWork {
  public abstract confirm(
    video: Video,
    event: VideoUploadedEvent,
  ): Promise<boolean>;
}

export type PendingOutboxMessage = Readonly<{
  id: string;
  eventType: string;
  eventVersion: number;
  occurredAt: Date;
  attempts: number;
  correlationId: string;
  payload: Readonly<Record<string, unknown>>;
}>;

export abstract class OutboxRepository {
  public abstract claim(
    batchSize: number,
    leaseUntil: Date,
  ): Promise<readonly PendingOutboxMessage[]>;
  public abstract markPublished(id: string, publishedAt: Date): Promise<void>;
  public abstract scheduleRetry(
    id: string,
    availableAt: Date,
    safeError: string,
  ): Promise<void>;
}

export abstract class IntegrationEventPublisher {
  public abstract publish(message: PendingOutboxMessage): Promise<void>;
}

export abstract class IdentifierGenerator {
  public abstract generate(): string;
}
