import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoSize } from '../../../src/contexts/video-management/domain/video-size';
import { VideoStatus } from '../../../src/contexts/video-management/domain/video-status';
import {
  InvalidOwnerIdError,
  InvalidVideoOriginalNameError,
  InvalidVideoStatusTransitionError,
  InvalidVideoZipKeyError,
  Video,
} from '../../../src/contexts/video-management/domain/video';

describe('Video', () => {
  const id = VideoId.create('video-1');
  const ownerId = 'user-1';
  const originalName = 'video.mp4';
  const format = VideoFormat.create('mp4');
  const size = VideoSize.create(1024, 1024 * 1024);
  const base = {
    id,
    ownerId,
    originalName,
    format,
    size,
    storageKey: 'original/user-1/video-1.mp4',
  };

  it('creates a pending video without a zip key', () => {
    const video = Video.create(base);

    expect(video.id.equals(id)).toBe(true);
    expect(video.ownerId).toBe(ownerId);
    expect(video.originalName).toBe(originalName);
    expect(video.format.equals(format)).toBe(true);
    expect(video.size.equals(size)).toBe(true);
    expect(video.storageKey).toBe('original/user-1/video-1.mp4');
    expect(video.status).toBe(VideoStatus.PENDING);
    expect(video.zipKey).toBeNull();
  });

  it('rejects a blank owner id', () => {
    expect(() => Video.create({ ...base, ownerId: '   ' })).toThrow(InvalidOwnerIdError);
  });

  it('rejects a blank original name', () => {
    expect(() => Video.create({ ...base, originalName: '   ' })).toThrow(
      InvalidVideoOriginalNameError,
    );
  });

  it('reconstitutes a persisted video', () => {
    const video = Video.reconstitute({
      ...base,
      status: VideoStatus.ANALYZED,
      zipKey: null,
      durationMs: null,
    });

    expect(video.status).toBe(VideoStatus.ANALYZED);
    expect(video.zipKey).toBeNull();
  });

  it('rejects a zip key on a non-completed video', () => {
    expect(() =>
      Video.reconstitute({
        ...base,
        status: VideoStatus.PROCESSING,
        zipKey: 'archive.zip',
        durationMs: null,
      }),
    ).toThrow(InvalidVideoZipKeyError);
  });

  it('rejects a completed video without a zip key', () => {
    expect(() =>
      Video.reconstitute({
        ...base,
        status: VideoStatus.COMPLETED,
        zipKey: null,
        durationMs: null,
      }),
    ).toThrow(InvalidVideoZipKeyError);
  });

  it('applies a valid transition', () => {
    const video = Video.create(base);

    video.transitionTo(VideoStatus.ANALYZED);

    expect(video.status).toBe(VideoStatus.ANALYZED);
  });

  it('rejects an invalid transition', () => {
    const video = Video.create(base);

    expect(() => video.transitionTo(VideoStatus.PROCESSING)).toThrow(
      InvalidVideoStatusTransitionError,
    );
  });

  it('requires complete() to reach COMPLETED', () => {
    const video = Video.reconstitute({
      ...base,
      status: VideoStatus.AGGREGATING,
      zipKey: null,
      durationMs: null,
    });

    expect(() => video.transitionTo(VideoStatus.COMPLETED)).toThrow(
      InvalidVideoStatusTransitionError,
    );
  });

  it('completes from AGGREGATING with a zip key', () => {
    const video = Video.reconstitute({
      ...base,
      status: VideoStatus.AGGREGATING,
      zipKey: null,
      durationMs: null,
    });

    video.complete('archive/video-1.zip');

    expect(video.status).toBe(VideoStatus.COMPLETED);
    expect(video.zipKey).toBe('archive/video-1.zip');
  });

  it('rejects completing with a blank zip key', () => {
    const video = Video.reconstitute({
      ...base,
      status: VideoStatus.AGGREGATING,
      zipKey: null,
      durationMs: null,
    });

    expect(() => video.complete('   ')).toThrow(InvalidVideoZipKeyError);
  });
});
