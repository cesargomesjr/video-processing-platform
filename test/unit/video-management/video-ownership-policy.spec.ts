import { Video } from '../../../src/contexts/video-management/domain/video';
import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoSize } from '../../../src/contexts/video-management/domain/video-size';
import {
  VideoNotAccessibleError,
  VideoOwnershipPolicy,
} from '../../../src/contexts/video-management/domain/video-ownership-policy';

describe('VideoOwnershipPolicy', () => {
  const policy = new VideoOwnershipPolicy();
  const video = Video.create({
    id: VideoId.create('video-1'),
    ownerId: 'user-1',
    originalName: 'video.mp4',
    format: VideoFormat.create('mp4'),
    size: VideoSize.create(1024, 1024 * 1024),
    storageKey: 'original/user-1/video-1.mp4',
  });

  it('allows the owner to access the video', () => {
    expect(() => policy.assertCanAccess(video, 'user-1')).not.toThrow();
  });

  it('rejects access from another user', () => {
    expect(() => policy.assertCanAccess(video, 'user-2')).toThrow(VideoNotAccessibleError);
  });

  it('rejects access with a blank user id', () => {
    expect(() => policy.assertCanAccess(video, '   ')).toThrow(VideoNotAccessibleError);
  });

  it('exposes ownership through Video.belongsTo', () => {
    expect(video.belongsTo('user-1')).toBe(true);
    expect(video.belongsTo('user-2')).toBe(false);
  });
});
