import {
  ChunkPlan,
  InvalidChunkPlanError,
} from '../../../src/contexts/video-processing/domain/chunk-plan';

describe('ChunkPlan', () => {
  it('creates one chunk for a video shorter than the chunk size', () => {
    const plan = ChunkPlan.create(1_000, 10, 100);

    expect(plan.windows).toEqual([{ startMs: 0, durationMs: 1_000 }]);
  });

  it('creates one chunk for a video exactly the chunk size', () => {
    const plan = ChunkPlan.create(10_000, 10, 100);

    expect(plan.windows).toEqual([{ startMs: 0, durationMs: 10_000 }]);
  });

  it('splits a video that does not divide evenly', () => {
    const plan = ChunkPlan.create(11_000, 10, 100);

    expect(plan.windows).toEqual([
      { startMs: 0, durationMs: 10_000 },
      { startMs: 10_000, durationMs: 1_000 },
    ]);
  });

  it('does not create an empty window for an exact multiple', () => {
    const plan = ChunkPlan.create(20_000, 10, 100);

    expect(plan.windows).toEqual([
      { startMs: 0, durationMs: 10_000 },
      { startMs: 10_000, durationMs: 10_000 },
    ]);
  });

  it('caps the number of chunks at maxChunks while covering the full duration', () => {
    const plan = ChunkPlan.create(100_000, 10, 5);

    expect(plan.windows).toHaveLength(5);

    let cursor = 0;
    for (const window of plan.windows) {
      expect(window.startMs).toBe(cursor);
      expect(window.durationMs).toBeGreaterThan(0);
      cursor += window.durationMs;
    }
    expect(cursor).toBe(100_000);
  });

  it('rejects a non-positive duration', () => {
    expect(() => ChunkPlan.create(0, 10, 100)).toThrow(InvalidChunkPlanError);
    expect(() => ChunkPlan.create(-1, 10, 100)).toThrow(InvalidChunkPlanError);
  });

  it('rejects invalid chunk size and max chunks', () => {
    expect(() => ChunkPlan.create(10_000, 0, 100)).toThrow(InvalidChunkPlanError);
    expect(() => ChunkPlan.create(10_000, 10, 0)).toThrow(InvalidChunkPlanError);
  });

  it('rejects non-integer inputs', () => {
    expect(() => ChunkPlan.create(10.5, 10, 100)).toThrow(InvalidChunkPlanError);
    expect(() => ChunkPlan.create(10_000, 10.5, 100)).toThrow(InvalidChunkPlanError);
    expect(() => ChunkPlan.create(10_000, 10, 5.5)).toThrow(InvalidChunkPlanError);
  });
});
