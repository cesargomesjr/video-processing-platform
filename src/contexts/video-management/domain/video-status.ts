import { DomainError } from './domain-error';

export const VIDEO_STATUS_VALUES = [
  'PENDING',
  'ANALYZED',
  'PROCESSING',
  'AGGREGATING',
  'COMPLETED',
  'FAILED',
] as const;

export type VideoStatusValue = (typeof VIDEO_STATUS_VALUES)[number];

const TRANSITIONS: Readonly<Record<VideoStatusValue, readonly VideoStatusValue[]>> = {
  PENDING: ['ANALYZED', 'FAILED'],
  ANALYZED: ['PROCESSING'],
  PROCESSING: ['AGGREGATING', 'FAILED'],
  AGGREGATING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: ['PENDING'],
};

export class InvalidVideoStatusError extends DomainError {
  public constructor(status: string) {
    super(`Invalid video status: ${status}`);
  }
}

export class VideoStatus {
  private constructor(private readonly _value: VideoStatusValue) {}

  public static readonly PENDING = new VideoStatus('PENDING');
  public static readonly ANALYZED = new VideoStatus('ANALYZED');
  public static readonly PROCESSING = new VideoStatus('PROCESSING');
  public static readonly AGGREGATING = new VideoStatus('AGGREGATING');
  public static readonly COMPLETED = new VideoStatus('COMPLETED');
  public static readonly FAILED = new VideoStatus('FAILED');

  public static fromValue(raw: string): VideoStatus {
    switch (raw) {
      case 'PENDING':
        return VideoStatus.PENDING;
      case 'ANALYZED':
        return VideoStatus.ANALYZED;
      case 'PROCESSING':
        return VideoStatus.PROCESSING;
      case 'AGGREGATING':
        return VideoStatus.AGGREGATING;
      case 'COMPLETED':
        return VideoStatus.COMPLETED;
      case 'FAILED':
        return VideoStatus.FAILED;
      default:
        throw new InvalidVideoStatusError(raw);
    }
  }

  public get value(): VideoStatusValue {
    return this._value;
  }

  public canTransitionTo(next: VideoStatus): boolean {
    return TRANSITIONS[this._value].includes(next._value);
  }

  public equals(other: VideoStatus): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
