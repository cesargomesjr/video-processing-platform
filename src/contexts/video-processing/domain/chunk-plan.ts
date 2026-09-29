import { DomainError } from './domain-error';

export interface ChunkWindow {
  startMs: number;
  durationMs: number;
}

export class InvalidChunkPlanError extends DomainError {
  public constructor(message: string) {
    super(message);
  }
}

export class ChunkPlan {
  private constructor(private readonly _windows: readonly ChunkWindow[]) {}

  public static create(durationMs: number, chunkSeconds: number, maxChunks: number): ChunkPlan {
    if (!Number.isSafeInteger(durationMs) || durationMs <= 0) {
      throw new InvalidChunkPlanError('durationMs must be a positive integer');
    }

    if (!Number.isSafeInteger(chunkSeconds) || chunkSeconds <= 0) {
      throw new InvalidChunkPlanError('chunkSeconds must be a positive integer');
    }

    if (!Number.isSafeInteger(maxChunks) || maxChunks <= 0) {
      throw new InvalidChunkPlanError('maxChunks must be a positive integer');
    }

    const chunkMs = chunkSeconds * 1_000;
    const naturalChunkCount = Math.ceil(durationMs / chunkMs);

    if (naturalChunkCount > maxChunks) {
      return new ChunkPlan(ChunkPlan.evenWindows(durationMs, maxChunks));
    }

    return new ChunkPlan(ChunkPlan.fixedWindows(durationMs, chunkMs));
  }

  public get windows(): readonly ChunkWindow[] {
    return this._windows;
  }

  private static fixedWindows(durationMs: number, chunkMs: number): ChunkWindow[] {
    const windows: ChunkWindow[] = [];
    let startMs = 0;

    while (startMs < durationMs) {
      const endMs = Math.min(startMs + chunkMs, durationMs);
      windows.push({ startMs, durationMs: endMs - startMs });
      startMs = endMs;
    }

    return windows;
  }

  private static evenWindows(durationMs: number, chunkCount: number): ChunkWindow[] {
    const windows: ChunkWindow[] = [];

    for (let index = 0; index < chunkCount; index += 1) {
      const startMs = Math.floor((durationMs * index) / chunkCount);
      const endMs = Math.ceil((durationMs * (index + 1)) / chunkCount);
      windows.push({ startMs, durationMs: endMs - startMs });
    }

    return windows;
  }
}
