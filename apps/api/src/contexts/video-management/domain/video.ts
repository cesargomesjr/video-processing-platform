import type { VideoId, VideoOwnerId } from './video-id.js';
import type { SupportedVideoContentType } from './video-upload-metadata.js';

export type VideoStatus =
  | 'AWAITING_UPLOAD'
  | 'PENDING'
  | 'ANALYZING'
  | 'PROCESSING'
  | 'AGGREGATING'
  | 'COMPLETED'
  | 'FAILED';

export type VerifiedVideoObject = Readonly<{
  version: string;
  etag: string;
  contentType: string;
  sizeBytes: number;
}>;

export type VideoProperties = Readonly<{
  id: VideoId;
  ownerId: VideoOwnerId;
  originalFilename: string;
  declaredContentType: SupportedVideoContentType;
  declaredSizeBytes: number;
  storageKey: string;
  status: VideoStatus;
  progress: number | null;
  uploadExpiresAt: Date;
  objectVersion: string | null;
  etag: string | null;
  verifiedContentType: string | null;
  verifiedSizeBytes: number | null;
  createdAt: Date;
  updatedAt: Date;
  uploadedAt: Date | null;
}>;

export class VideoUploadMismatchError extends Error {
  public constructor() {
    super('Uploaded object metadata does not match the declaration');
    this.name = 'VideoUploadMismatchError';
  }
}

export class Video {
  private constructor(private properties: VideoProperties) {}

  public static create(
    input: Readonly<{
      id: VideoId;
      ownerId: VideoOwnerId;
      originalFilename: string;
      declaredContentType: SupportedVideoContentType;
      declaredSizeBytes: number;
      storageKey: string;
      uploadExpiresAt: Date;
      now: Date;
    }>,
  ): Video {
    return new Video({
      ...input,
      status: 'AWAITING_UPLOAD',
      progress: null,
      objectVersion: null,
      etag: null,
      verifiedContentType: null,
      verifiedSizeBytes: null,
      createdAt: input.now,
      updatedAt: input.now,
      uploadedAt: null,
    });
  }

  public static restore(properties: VideoProperties): Video {
    return new Video(properties);
  }

  public confirm(object: VerifiedVideoObject, now: Date): void {
    if (this.properties.status !== 'AWAITING_UPLOAD') {
      return;
    }

    if (
      object.version.trim().length === 0 ||
      object.etag.trim().length === 0 ||
      object.contentType !== this.properties.declaredContentType ||
      object.sizeBytes !== this.properties.declaredSizeBytes
    ) {
      throw new VideoUploadMismatchError();
    }

    this.properties = {
      ...this.properties,
      status: 'PENDING',
      objectVersion: object.version,
      etag: object.etag,
      verifiedContentType: object.contentType,
      verifiedSizeBytes: object.sizeBytes,
      updatedAt: now,
      uploadedAt: now,
    };
  }

  public get snapshot(): VideoProperties {
    return this.properties;
  }
}
