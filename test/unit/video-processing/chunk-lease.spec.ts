import {
  ChunkLease,
  InvalidChunkLeaseError,
} from '../../../src/contexts/video-processing/domain/chunk-lease';

describe('ChunkLease', () => {
  it('is not expired before lockedUntil', () => {
    const lease = ChunkLease.create('worker-1', new Date('2026-01-01T00:01:00.000Z'));

    expect(lease.isExpired(new Date('2026-01-01T00:00:59.000Z'))).toBe(false);
  });

  it('is expired at or after lockedUntil', () => {
    const lease = ChunkLease.create('worker-1', new Date('2026-01-01T00:01:00.000Z'));

    expect(lease.isExpired(new Date('2026-01-01T00:01:00.000Z'))).toBe(true);
    expect(lease.isExpired(new Date('2026-01-01T00:01:01.000Z'))).toBe(true);
  });

  it('renews with a new lockedUntil keeping the worker id', () => {
    const lease = ChunkLease.create('worker-1', new Date('2026-01-01T00:01:00.000Z'));

    const renewed = lease.renew(new Date('2026-01-01T00:02:00.000Z'));

    expect(renewed.workerId).toBe('worker-1');
    expect(renewed.lockedUntil).toEqual(new Date('2026-01-01T00:02:00.000Z'));
  });

  it('rejects a blank worker id', () => {
    expect(() => ChunkLease.create('   ', new Date())).toThrow(InvalidChunkLeaseError);
  });
});
