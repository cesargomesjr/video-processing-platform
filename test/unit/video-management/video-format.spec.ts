import {
  UnsupportedVideoFormatError,
  VideoFormat,
} from '../../../src/contexts/video-management/domain/video-format';

describe('VideoFormat', () => {
  it.each(['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'])('accepts %s', (extension) => {
    expect(VideoFormat.create(extension).value).toBe(extension);
  });

  it('normalizes to lowercase and strips a leading dot', () => {
    expect(VideoFormat.create('  .MP4 ').value).toBe('mp4');
  });

  it('rejects unsupported extensions', () => {
    expect(() => VideoFormat.create('exe')).toThrow(UnsupportedVideoFormatError);
    expect(() => VideoFormat.create('.exe')).toThrow(UnsupportedVideoFormatError);
  });

  it('rejects blank values', () => {
    expect(() => VideoFormat.create('')).toThrow(UnsupportedVideoFormatError);
    expect(() => VideoFormat.create('   ')).toThrow(UnsupportedVideoFormatError);
  });

  it('compares by normalized value', () => {
    expect(VideoFormat.create('.MP4').equals(VideoFormat.create('mp4'))).toBe(true);
    expect(VideoFormat.create('mp4').equals(VideoFormat.create('mov'))).toBe(false);
  });

  it('exposes the normalized extension with and without the leading dot', () => {
    const format = VideoFormat.create('.MP4');

    expect(format.extension).toBe('.mp4');
    expect(format.toString()).toBe('mp4');
  });
});
