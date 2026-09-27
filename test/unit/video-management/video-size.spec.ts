import {
  InvalidVideoSizeError,
  VideoSize,
} from '../../../src/contexts/video-management/domain/video-size';

describe('VideoSize', () => {
  const MAX_BYTES = 1024 * 1024;

  it('accepts a positive size within the limit', () => {
    expect(VideoSize.create(1024, MAX_BYTES).bytes).toBe(1024);
  });

  it('accepts a size exactly at the limit', () => {
    expect(VideoSize.create(MAX_BYTES, MAX_BYTES).bytes).toBe(MAX_BYTES);
  });

  it('rejects zero and negative sizes', () => {
    expect(() => VideoSize.create(0, MAX_BYTES)).toThrow(InvalidVideoSizeError);
    expect(() => VideoSize.create(-1, MAX_BYTES)).toThrow(InvalidVideoSizeError);
  });

  it('rejects sizes above the limit', () => {
    expect(() => VideoSize.create(MAX_BYTES + 1, MAX_BYTES)).toThrow(InvalidVideoSizeError);
  });

  it('rejects non-integer sizes', () => {
    expect(() => VideoSize.create(10.5, MAX_BYTES)).toThrow(InvalidVideoSizeError);
  });

  it('rejects an invalid limit', () => {
    expect(() => VideoSize.create(1, 0)).toThrow(InvalidVideoSizeError);
    expect(() => VideoSize.create(1, -5)).toThrow(InvalidVideoSizeError);
  });

  it('compares by value', () => {
    expect(VideoSize.create(100, MAX_BYTES).equals(VideoSize.create(100, MAX_BYTES))).toBe(true);
    expect(VideoSize.create(100, MAX_BYTES).equals(VideoSize.create(200, MAX_BYTES))).toBe(false);
  });

  it('exposes the size through toString', () => {
    expect(VideoSize.create(1234, MAX_BYTES).toString()).toBe('1234');
  });
});
