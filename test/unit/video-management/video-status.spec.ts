import {
  InvalidVideoStatusError,
  VideoStatus,
} from '../../../src/contexts/video-management/domain/video-status';

describe('VideoStatus', () => {
  it.each([
    ['PENDING', 'ANALYZED', true],
    ['PENDING', 'FAILED', true],
    ['PENDING', 'PROCESSING', false],
    ['ANALYZED', 'PROCESSING', true],
    ['ANALYZED', 'ANALYZED', false],
    ['PROCESSING', 'AGGREGATING', true],
    ['PROCESSING', 'FAILED', true],
    ['AGGREGATING', 'COMPLETED', true],
    ['AGGREGATING', 'FAILED', true],
    ['COMPLETED', 'FAILED', false],
    ['COMPLETED', 'PENDING', false],
    ['FAILED', 'PENDING', true],
    ['FAILED', 'PROCESSING', false],
  ])('%s -> %s is %s', (from, to, expected) => {
    expect(VideoStatus.fromValue(from).canTransitionTo(VideoStatus.fromValue(to))).toBe(expected);
  });

  it('rejects an unknown status', () => {
    expect(() => VideoStatus.fromValue('UNKNOWN')).toThrow(InvalidVideoStatusError);
  });

  it('exposes its value and compares by value', () => {
    expect(VideoStatus.fromValue('PENDING').value).toBe('PENDING');
    expect(VideoStatus.PENDING.equals(VideoStatus.fromValue('PENDING'))).toBe(true);
    expect(VideoStatus.PENDING.equals(VideoStatus.FAILED)).toBe(false);
  });

  it('exposes the value through toString', () => {
    expect(VideoStatus.PENDING.toString()).toBe('PENDING');
  });
});
