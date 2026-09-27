import { DomainError } from './domain-error';
import { VideoFormat } from './video-format';
import { VideoId } from './video-id';
import { VideoSize } from './video-size';
import { VideoStatus } from './video-status';

export class InvalidOwnerIdError extends DomainError {
  public constructor() {
    super('Owner id must not be empty');
  }
}

export class InvalidVideoOriginalNameError extends DomainError {
  public constructor() {
    super('Original name must not be empty');
  }
}

export class InvalidVideoZipKeyError extends DomainError {
  public constructor() {
    super('A video must have a zip key when completed and no zip key otherwise');
  }
}

export class InvalidVideoStorageKeyError extends DomainError {
  public constructor() {
    super('Storage key must not be empty');
  }
}

export class InvalidVideoStatusTransitionError extends DomainError {
  public constructor(from: VideoStatus, to: VideoStatus) {
    super(`Invalid video status transition: ${from.value} -> ${to.value}`);
  }
}

interface VideoCreateInput {
  id: VideoId;
  ownerId: string;
  originalName: string;
  format: VideoFormat;
  size: VideoSize;
  storageKey: string;
}

interface VideoReconstituteInput extends VideoCreateInput {
  status: VideoStatus;
  zipKey: string | null;
}

export class Video {
  private constructor(
    private readonly _id: VideoId,
    private readonly _ownerId: string,
    private readonly _originalName: string,
    private readonly _format: VideoFormat,
    private readonly _size: VideoSize,
    private readonly _storageKey: string,
    private _status: VideoStatus,
    private _zipKey: string | null,
  ) {}

  public static create(input: VideoCreateInput): Video {
    return Video.reconstitute({
      ...input,
      status: VideoStatus.PENDING,
      zipKey: null,
    });
  }

  public static reconstitute(input: VideoReconstituteInput): Video {
    if (input.ownerId.trim().length === 0) {
      throw new InvalidOwnerIdError();
    }

    if (input.originalName.trim().length === 0) {
      throw new InvalidVideoOriginalNameError();
    }

    if (input.storageKey.trim().length === 0) {
      throw new InvalidVideoStorageKeyError();
    }

    if (input.status === VideoStatus.COMPLETED && input.zipKey === null) {
      throw new InvalidVideoZipKeyError();
    }

    if (input.status !== VideoStatus.COMPLETED && input.zipKey !== null) {
      throw new InvalidVideoZipKeyError();
    }

    return new Video(
      input.id,
      input.ownerId,
      input.originalName,
      input.format,
      input.size,
      input.storageKey,
      input.status,
      input.zipKey,
    );
  }

  public transitionTo(next: VideoStatus): void {
    if (next === VideoStatus.COMPLETED || !this._status.canTransitionTo(next)) {
      throw new InvalidVideoStatusTransitionError(this._status, next);
    }

    this._status = next;
  }

  public complete(zipKey: string): void {
    if (zipKey.trim().length === 0) {
      throw new InvalidVideoZipKeyError();
    }

    if (!this._status.canTransitionTo(VideoStatus.COMPLETED)) {
      throw new InvalidVideoStatusTransitionError(this._status, VideoStatus.COMPLETED);
    }

    this._zipKey = zipKey;
    this._status = VideoStatus.COMPLETED;
  }

  public belongsTo(userId: string): boolean {
    return this._ownerId === userId;
  }

  public get id(): VideoId {
    return this._id;
  }

  public get ownerId(): string {
    return this._ownerId;
  }

  public get originalName(): string {
    return this._originalName;
  }

  public get format(): VideoFormat {
    return this._format;
  }

  public get size(): VideoSize {
    return this._size;
  }

  public get storageKey(): string {
    return this._storageKey;
  }

  public get status(): VideoStatus {
    return this._status;
  }

  public get zipKey(): string | null {
    return this._zipKey;
  }
}
