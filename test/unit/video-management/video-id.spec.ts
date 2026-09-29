import {
  InvalidVideoIdError,
  VideoId,
} from '../../../src/contexts/video-management/domain/video-id';

describe('VideoId', () => {
  it('accepts a non-empty opaque id', () => {
    expect(VideoId.create('video-123').value).toBe('video-123');
  });

  it('rejects blank ids', () => {
    expect(() => VideoId.create('')).toThrow(InvalidVideoIdError);
    expect(() => VideoId.create('   ')).toThrow(InvalidVideoIdError);
  });

  it('compares by value', () => {
    expect(VideoId.create('video-1').equals(VideoId.create('video-1'))).toBe(true);
    expect(VideoId.create('video-1').equals(VideoId.create('video-2'))).toBe(false);
  });

  it('exposes the id through toString', () => {
    expect(VideoId.create('video-1').toString()).toBe('video-1');
  });
});
