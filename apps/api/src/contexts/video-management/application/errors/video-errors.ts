export class VideoNotFoundError extends Error {
  public constructor() {
    super('Video not found');
    this.name = 'VideoNotFoundError';
  }
}

export class VideoUploadNotFoundError extends Error {
  public constructor() {
    super('Uploaded object was not found');
    this.name = 'VideoUploadNotFoundError';
  }
}

export class VideoUploadInvalidStateError extends Error {
  public constructor() {
    super('Video upload cannot be confirmed from its current state');
    this.name = 'VideoUploadInvalidStateError';
  }
}

export class VideoStorageUnavailableError extends Error {
  public constructor() {
    super('Video storage is temporarily unavailable');
    this.name = 'VideoStorageUnavailableError';
  }
}

export class InvalidVideoCursorError extends Error {
  public constructor() {
    super('Invalid video cursor');
    this.name = 'InvalidVideoCursorError';
  }
}
