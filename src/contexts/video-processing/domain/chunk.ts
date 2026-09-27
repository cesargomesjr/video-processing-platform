import { DomainError } from './domain-error';
import { ChunkLease } from './chunk-lease';
import { ChunkStatus } from './chunk-status';

export class InvalidChunkError extends DomainError {
  public constructor(message: string) {
    super(message);
  }
}

export class ChunkAlreadyCompletedError extends DomainError {
  public constructor() {
    super('Chunk is already completed');
  }
}

export class InvalidChunkStatusTransitionError extends DomainError {
  public constructor(from: ChunkStatus, to: ChunkStatus) {
    super(`Invalid chunk status transition: ${from.value} -> ${to.value}`);
  }
}

interface ChunkCreateInput {
  videoId: string;
  index: number;
  totalChunks: number;
  startMs?: number;
  durationMs?: number;
}

interface ChunkReconstituteInput extends Omit<ChunkCreateInput, 'totalChunks'> {
  totalChunks?: number;
  status: ChunkStatus;
  frameCount: number | null;
  lease?: ChunkLease | null;
}

export class Chunk {
  private constructor(
    private readonly _videoId: string,
    private readonly _index: number,
    private _status: ChunkStatus,
    private _frameCount: number | null,
    private _lease: ChunkLease | null,
    private readonly _startMs: number,
    private readonly _durationMs: number,
  ) {}

  public static create(input: ChunkCreateInput): Chunk {
    return Chunk.reconstitute({
      ...input,
      startMs: input.startMs ?? 0,
      durationMs: input.durationMs ?? 1,
      status: ChunkStatus.PENDING,
      frameCount: null,
      lease: null,
    });
  }

  public static reconstitute(input: ChunkReconstituteInput): Chunk {
    if (input.videoId.trim().length === 0) {
      throw new InvalidChunkError('videoId must not be empty');
    }

    if (!Number.isInteger(input.index) || input.index < 0) {
      throw new InvalidChunkError('index must be a non-negative integer');
    }

    if (input.totalChunks !== undefined && input.index >= input.totalChunks) {
      throw new InvalidChunkError('index must be lower than totalChunks');
    }

    if (
      input.frameCount !== null &&
      (!Number.isInteger(input.frameCount) || input.frameCount < 0)
    ) {
      throw new InvalidChunkError('frameCount must be a non-negative integer or null');
    }

    const startMs = input.startMs ?? 0;
    const durationMs = input.durationMs ?? 1;

    if (!Number.isInteger(startMs) || startMs < 0) {
      throw new InvalidChunkError('startMs must be a non-negative integer');
    }

    if (!Number.isInteger(durationMs) || durationMs <= 0) {
      throw new InvalidChunkError('durationMs must be a positive integer');
    }

    return new Chunk(
      input.videoId,
      input.index,
      input.status,
      input.frameCount,
      input.lease ?? null,
      startMs,
      durationMs,
    );
  }

  public markAsProcessing(): void {
    if (this._status === ChunkStatus.COMPLETED) {
      throw new ChunkAlreadyCompletedError();
    }

    this.transitionTo(ChunkStatus.PROCESSING);
  }

  public claim(workerId: string, lockedUntil: Date): void {
    if (this._status === ChunkStatus.COMPLETED) {
      throw new ChunkAlreadyCompletedError();
    }

    this.transitionTo(ChunkStatus.PROCESSING);
    this._lease = ChunkLease.create(workerId, lockedUntil);
  }

  public markAsCompleted(frameCount: number): void {
    if (!Number.isInteger(frameCount) || frameCount < 0) {
      throw new InvalidChunkError('frameCount must be a non-negative integer');
    }

    this.transitionTo(ChunkStatus.COMPLETED);
    this._frameCount = frameCount;
    this._lease = null;
  }

  public markAsFailed(): void {
    this.transitionTo(ChunkStatus.FAILED);
    this._lease = null;
  }

  public retry(): void {
    this.transitionTo(ChunkStatus.PENDING);
    this._lease = null;
  }

  public release(): void {
    this.transitionTo(ChunkStatus.PENDING);
    this._lease = null;
  }

  public isLeaseExpired(now: Date): boolean {
    return this._lease !== null && this._lease.isExpired(now);
  }

  public renewLease(lockedUntil: Date): void {
    if (this._lease === null) {
      throw new InvalidChunkError('chunk has no lease to renew');
    }

    this._lease = this._lease.renew(lockedUntil);
  }

  public get videoId(): string {
    return this._videoId;
  }

  public get index(): number {
    return this._index;
  }

  public get status(): ChunkStatus {
    return this._status;
  }

  public get frameCount(): number | null {
    return this._frameCount;
  }

  public get lease(): ChunkLease | null {
    return this._lease;
  }

  public get startMs(): number {
    return this._startMs;
  }

  public get durationMs(): number {
    return this._durationMs;
  }

  private transitionTo(next: ChunkStatus): void {
    if (!this._status.canTransitionTo(next)) {
      throw new InvalidChunkStatusTransitionError(this._status, next);
    }

    this._status = next;
  }
}
