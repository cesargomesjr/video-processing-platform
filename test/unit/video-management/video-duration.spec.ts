import {
  InvalidVideoDurationError,
  VideoDuration,
} from '../../../src/contexts/video-management/domain/video-duration';

describe('VideoDuration', () => {
  const MAX_MILLISECONDS = 10 * 60 * 1000;

  it('accepts a positive duration within the limit', () => {
    expect(VideoDuration.create(1000, MAX_MILLISECONDS).milliseconds).toBe(1000);
  });

  it('accepts a duration exactly at the limit', () => {
    expect(VideoDuration.create(MAX_MILLISECONDS, MAX_MILLISECONDS).milliseconds).toBe(
      MAX_MILLISECONDS,
    );
  });

  it('rejects zero and negative durations', () => {
    expect(() => VideoDuration.create(0, MAX_MILLISECONDS)).toThrow(InvalidVideoDurationError);
    expect(() => VideoDuration.create(-1, MAX_MILLISECONDS)).toThrow(InvalidVideoDurationError);
  });

  it('rejects durations above the limit', () => {
    expect(() => VideoDuration.create(MAX_MILLISECONDS + 1, MAX_MILLISECONDS)).toThrow(
      InvalidVideoDurationError,
    );
  });

  it('rejects non-integer durations', () => {
    expect(() => VideoDuration.create(1000.5, MAX_MILLISECONDS)).toThrow(InvalidVideoDurationError);
  });

  it('rejects an invalid limit', () => {
    expect(() => VideoDuration.create(1, 0)).toThrow(InvalidVideoDurationError);
    expect(() => VideoDuration.create(1, -1)).toThrow(InvalidVideoDurationError);
  });

  it('compares by value', () => {
    expect(
      VideoDuration.create(1000, MAX_MILLISECONDS).equals(
        VideoDuration.create(1000, MAX_MILLISECONDS),
      ),
    ).toBe(true);
    expect(
      VideoDuration.create(1000, MAX_MILLISECONDS).equals(
        VideoDuration.create(2000, MAX_MILLISECONDS),
      ),
    ).toBe(false);
  });

  it('exposes the duration through toString', () => {
    expect(VideoDuration.create(1234, MAX_MILLISECONDS).toString()).toBe('1234');
  });
});
