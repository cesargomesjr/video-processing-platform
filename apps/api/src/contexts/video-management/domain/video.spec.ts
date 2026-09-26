import { VideoId, VideoOwnerId } from './video-id.js';
import {
  InvalidVideoUploadError,
  UnsupportedVideoTypeError,
  VideoTooLargeError,
  VideoUploadMetadata,
} from './video-upload-metadata.js';
import { Video, VideoUploadMismatchError } from './video.js';

const VIDEO_ID = VideoId.create('c2b74699-001f-4144-8754-f5936b3b4b35');
const OWNER_ID = VideoOwnerId.create('a8bcdb79-42a2-4503-b678-263b772f62e3');
const NOW = new Date('2026-09-26T10:00:00.000Z');

function createVideo(): Video {
  return Video.create({
    id: VIDEO_ID,
    ownerId: OWNER_ID,
    originalFilename: 'sample.mp4',
    declaredContentType: 'video/mp4',
    declaredSizeBytes: 100,
    storageKey: `videos/${VIDEO_ID.toString()}/original.mp4`,
    uploadExpiresAt: new Date('2026-09-26T10:15:00.000Z'),
    now: NOW,
  });
}

describe('Video domain', () => {
  it.each([
    ['clip.mp4', 'video/mp4', 'mp4'],
    ['clip.mov', 'video/quicktime', 'mov'],
    ['clip.mkv', 'video/x-matroska', 'mkv'],
    ['clip.webm', 'video/webm', 'webm'],
  ])('accepts supported %s metadata', (filename, contentType, extension) => {
    const metadata = VideoUploadMetadata.create(
      { filename, contentType, sizeBytes: 100 },
      200,
    );

    expect(metadata.canonicalExtension).toBe(extension);
  });

  it.each(['', '../clip.mp4', 'folder/clip.mp4', 'clip\u0000.mp4'])(
    'rejects unsafe filename %p',
    (filename) => {
      expect(() =>
        VideoUploadMetadata.create(
          { filename, contentType: 'video/mp4', sizeBytes: 100 },
          200,
        ),
      ).toThrow(InvalidVideoUploadError);
    },
  );

  it('rejects unsupported type and mismatched extension', () => {
    expect(() =>
      VideoUploadMetadata.create(
        { filename: 'clip.mov', contentType: 'video/mp4', sizeBytes: 100 },
        200,
      ),
    ).toThrow(UnsupportedVideoTypeError);
  });

  it('rejects a video above the limit', () => {
    expect(() =>
      VideoUploadMetadata.create(
        { filename: 'clip.mp4', contentType: 'video/mp4', sizeBytes: 201 },
        200,
      ),
    ).toThrow(VideoTooLargeError);
  });

  it('confirms a matching object and ignores repeated confirmation', () => {
    const video = createVideo();
    const object = {
      version: 'v1',
      etag: 'etag',
      contentType: 'video/mp4',
      sizeBytes: 100,
    };

    video.confirm(object, new Date('2026-09-26T10:05:00.000Z'));
    video.confirm(object, new Date('2026-09-26T10:06:00.000Z'));

    expect(video.snapshot.status).toBe('PENDING');
    expect(video.snapshot.objectVersion).toBe('v1');
    expect(video.snapshot.updatedAt).toEqual(
      new Date('2026-09-26T10:05:00.000Z'),
    );
  });

  it('rejects mismatched object metadata', () => {
    const video = createVideo();

    expect(() => {
      video.confirm(
        {
          version: 'v1',
          etag: 'etag',
          contentType: 'video/mp4',
          sizeBytes: 99,
        },
        NOW,
      );
    }).toThrow(VideoUploadMismatchError);
  });
});
