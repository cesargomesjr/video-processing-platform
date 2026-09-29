import { DomainError } from '../domain/domain-error';

export class VideoTooLargeError extends DomainError {
  public constructor(sizeBytes: number, maxBytes: number) {
    super(`Video is too large: ${sizeBytes} bytes exceeds ${maxBytes} bytes`);
  }
}

export class VideoContentMismatchError extends DomainError {
  public constructor(format: string) {
    super(`Video content does not match the declared format: ${format}`);
  }
}

export class VideoStorageWriteError extends DomainError {
  public constructor() {
    super('Failed to write video content to storage');
  }
}

export class VideoNotFoundError extends DomainError {
  public constructor() {
    super('Video not found');
  }
}

export class VideoNotCompletedError extends DomainError {
  public constructor(status: string) {
    super(`Video is not completed: ${status}`);
  }
}

export class InvalidPaginationError extends DomainError {
  public constructor() {
    super('Invalid pagination parameters');
  }
}
