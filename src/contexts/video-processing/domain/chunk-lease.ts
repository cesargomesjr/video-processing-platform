import { DomainError } from './domain-error';

export class InvalidChunkLeaseError extends DomainError {
  public constructor(message: string) {
    super(message);
  }
}

export class ChunkLease {
  private constructor(
    private readonly _workerId: string,
    private readonly _lockedUntil: Date,
  ) {}

  public static create(workerId: string, lockedUntil: Date): ChunkLease {
    if (workerId.trim().length === 0) {
      throw new InvalidChunkLeaseError('workerId must not be empty');
    }

    if (Number.isNaN(lockedUntil.getTime())) {
      throw new InvalidChunkLeaseError('lockedUntil must be a valid date');
    }

    return new ChunkLease(workerId.trim(), new Date(lockedUntil.getTime()));
  }

  public get workerId(): string {
    return this._workerId;
  }

  public get lockedUntil(): Date {
    return new Date(this._lockedUntil.getTime());
  }

  public isExpired(now: Date): boolean {
    return now.getTime() >= this._lockedUntil.getTime();
  }

  public renew(lockedUntil: Date): ChunkLease {
    return ChunkLease.create(this._workerId, lockedUntil);
  }
}
