import { DomainError } from './domain-error';

export class InvalidVideoDurationError extends DomainError {
  public constructor(milliseconds: number, maxMilliseconds: number) {
    super(
      `Video duration must be an integer between 1 and ${maxMilliseconds} ms; got ${milliseconds}`,
    );
  }
}

export class VideoDuration {
  private constructor(private readonly _milliseconds: number) {}

  public static create(milliseconds: number, maxMilliseconds: number): VideoDuration {
    if (
      !Number.isSafeInteger(milliseconds) ||
      milliseconds <= 0 ||
      !Number.isSafeInteger(maxMilliseconds) ||
      maxMilliseconds <= 0 ||
      milliseconds > maxMilliseconds
    ) {
      throw new InvalidVideoDurationError(milliseconds, maxMilliseconds);
    }

    return new VideoDuration(milliseconds);
  }

  public get milliseconds(): number {
    return this._milliseconds;
  }

  public equals(other: VideoDuration): boolean {
    return this._milliseconds === other._milliseconds;
  }

  public toString(): string {
    return String(this._milliseconds);
  }
}
