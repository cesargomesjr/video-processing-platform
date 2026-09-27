import { DomainError } from './domain-error';
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
}

interface ChunkReconstituteInput extends ChunkCreateInput {
  status: ChunkStatus;
  frameCount: number | null;
}

export class Chunk {
  private constructor(
    private readonly _videoId: string,
    private readonly _index: number,
    private _status: ChunkStatus,
    private _frameCount: number | null,
  ) {}

  public static create(input: ChunkCreateInput): Chunk {
    return Chunk.reconstitute({
      ...input,
      status: ChunkStatus.PENDING,
      frameCount: null,
    });
  }

  public static reconstitute(input: ChunkReconstituteInput): Chunk {
    if (input.videoId.trim().length === 0) {
      throw new InvalidChunkError('videoId must not be empty');
    }

    if (!Number.isInteger(input.index) || input.index < 0) {
      throw new InvalidChunkError('index must be a non-negative integer');
    }

    if (
      !Number.isInteger(input.totalChunks) ||
      input.totalChunks <= 0 ||
      input.index >= input.totalChunks
    ) {
      throw new InvalidChunkError('index must be lower than totalChunks');
    }

    if (
      input.frameCount !== null &&
      (!Number.isInteger(input.frameCount) || input.frameCount < 0)
    ) {
      throw new InvalidChunkError('frameCount must be a non-negative integer or null');
    }

    return new Chunk(input.videoId, input.index, input.status, input.frameCount);
  }

  public markAsProcessing(): void {
    if (this._status === ChunkStatus.COMPLETED) {
      throw new ChunkAlreadyCompletedError();
    }

    this.transitionTo(ChunkStatus.PROCESSING);
  }

  public markAsCompleted(frameCount: number): void {
    if (!Number.isInteger(frameCount) || frameCount < 0) {
      throw new InvalidChunkError('frameCount must be a non-negative integer');
    }

    this.transitionTo(ChunkStatus.COMPLETED);
    this._frameCount = frameCount;
  }

  public markAsFailed(): void {
    this.transitionTo(ChunkStatus.FAILED);
  }

  public retry(): void {
    this.transitionTo(ChunkStatus.PENDING);
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

  private transitionTo(next: ChunkStatus): void {
    if (!this._status.canTransitionTo(next)) {
      throw new InvalidChunkStatusTransitionError(this._status, next);
    }

    this._status = next;
  }
}
