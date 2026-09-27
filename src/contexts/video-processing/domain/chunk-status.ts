import { DomainError } from './domain-error';

export const CHUNK_STATUS_VALUES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;

export type ChunkStatusValue = (typeof CHUNK_STATUS_VALUES)[number];

const TRANSITIONS: Readonly<Record<ChunkStatusValue, readonly ChunkStatusValue[]>> = {
  PENDING: ['PROCESSING'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: ['PENDING'],
};

export class InvalidChunkStatusError extends DomainError {
  public constructor(status: string) {
    super(`Invalid chunk status: ${status}`);
  }
}

export class ChunkStatus {
  private constructor(private readonly _value: ChunkStatusValue) {}

  public static readonly PENDING = new ChunkStatus('PENDING');
  public static readonly PROCESSING = new ChunkStatus('PROCESSING');
  public static readonly COMPLETED = new ChunkStatus('COMPLETED');
  public static readonly FAILED = new ChunkStatus('FAILED');

  public static fromValue(raw: string): ChunkStatus {
    switch (raw) {
      case 'PENDING':
        return ChunkStatus.PENDING;
      case 'PROCESSING':
        return ChunkStatus.PROCESSING;
      case 'COMPLETED':
        return ChunkStatus.COMPLETED;
      case 'FAILED':
        return ChunkStatus.FAILED;
      default:
        throw new InvalidChunkStatusError(raw);
    }
  }

  public get value(): ChunkStatusValue {
    return this._value;
  }

  public canTransitionTo(next: ChunkStatus): boolean {
    return TRANSITIONS[this._value].includes(next._value);
  }

  public equals(other: ChunkStatus): boolean {
    return this._value === other._value;
  }
}
