import { DomainError } from './domain-error';

export class InvalidVideoIdError extends DomainError {
  public constructor() {
    super('Video id must not be empty');
  }
}

export class VideoId {
  private constructor(private readonly _value: string) {}

  public static create(raw: string): VideoId {
    if (raw.trim().length === 0) {
      throw new InvalidVideoIdError();
    }

    return new VideoId(raw);
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: VideoId): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
