import {
  ChunkStatus,
  InvalidChunkStatusError,
} from '../../../src/contexts/video-processing/domain/chunk-status';

describe('ChunkStatus', () => {
  it.each([
    ['PENDING', 'PROCESSING', true],
    ['PENDING', 'COMPLETED', false],
    ['PROCESSING', 'COMPLETED', true],
    ['PROCESSING', 'FAILED', true],
    ['FAILED', 'PENDING', true],
    ['FAILED', 'PROCESSING', false],
    ['COMPLETED', 'PENDING', false],
    ['COMPLETED', 'PROCESSING', false],
  ])('%s -> %s is %s', (from, to, expected) => {
    expect(ChunkStatus.fromValue(from).canTransitionTo(ChunkStatus.fromValue(to))).toBe(expected);
  });

  it('rejects an unknown status', () => {
    expect(() => ChunkStatus.fromValue('UNKNOWN')).toThrow(InvalidChunkStatusError);
  });

  it('exposes its value and compares by value', () => {
    expect(ChunkStatus.fromValue('PENDING').value).toBe('PENDING');
    expect(ChunkStatus.PENDING.equals(ChunkStatus.fromValue('PENDING'))).toBe(true);
    expect(ChunkStatus.PENDING.equals(ChunkStatus.COMPLETED)).toBe(false);
  });
});
