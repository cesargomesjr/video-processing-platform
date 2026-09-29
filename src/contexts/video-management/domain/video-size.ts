import { DomainError } from './domain-error';

export class InvalidVideoSizeError extends DomainError {
  public constructor(sizeBytes: number, maxBytes?: number) {
    super(
      maxBytes === undefined
        ? `Video size must be a positive integer; got ${sizeBytes}`
        : `Video size must be an integer between 1 and ${maxBytes} bytes; got ${sizeBytes}`,
    );
  }
}

export class VideoSize {
  private constructor(private readonly _bytes: number) {}

  public static create(bytes: number, maxBytes: number): VideoSize {
    if (
      !Number.isSafeInteger(bytes) ||
      bytes <= 0 ||
      !Number.isSafeInteger(maxBytes) ||
      maxBytes <= 0 ||
      bytes > maxBytes
    ) {
      throw new InvalidVideoSizeError(bytes, maxBytes);
    }

    return new VideoSize(bytes);
  }

  public static reconstitute(bytes: number): VideoSize {
    if (!Number.isSafeInteger(bytes) || bytes <= 0) {
      throw new InvalidVideoSizeError(bytes);
    }

    return new VideoSize(bytes);
  }

  public get bytes(): number {
    return this._bytes;
  }

  public equals(other: VideoSize): boolean {
    return this._bytes === other._bytes;
  }

  public toString(): string {
    return String(this._bytes);
  }
}
