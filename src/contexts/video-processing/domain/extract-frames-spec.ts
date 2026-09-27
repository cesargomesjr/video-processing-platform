import { DomainError } from './domain-error';

export class InvalidExtractFramesSpecError extends DomainError {
  public constructor() {
    super('startSeconds must be a non-negative finite number');
  }
}

export class ExtractFramesSpec {
  public static readonly FPS = 1;

  private constructor(private readonly _startNumber: number) {}

  public static create(startSeconds: number): ExtractFramesSpec {
    if (!Number.isFinite(startSeconds) || startSeconds < 0) {
      throw new InvalidExtractFramesSpecError();
    }

    return new ExtractFramesSpec(Math.floor(startSeconds));
  }

  public get startNumber(): number {
    return this._startNumber;
  }

  public frameName(second: number): string {
    return `frame_${String(Math.floor(second)).padStart(6, '0')}.png`;
  }
}
