import {
  archiveKey,
  framesPrefix,
  originalVideoKey,
  videoObjectRoot,
} from '../../../src/platform/storage/video-object-keys';

describe('video object keys', () => {
  it('groups a video and its artifacts under the owner email and a readable unique name', () => {
    const root = videoObjectRoot('Email@Email.com.br', 'Vídeo de Teste 01.mp4', 'video-123');

    expect(root).toBe('email@email.com.br/Original/video-de-teste-01--video-123');
    const original = originalVideoKey(root, '.mp4');
    expect(original).toBe(`${root}/original.mp4`);
    expect(framesPrefix(original)).toBe(`${root}/frames/`);
    expect(archiveKey(original)).toBe(`${root}/archives/frames.zip`);
    expect(videoObjectRoot('Email@Email.com.br', 'Vídeo de Teste 01.mp4', 'video-456')).not.toBe(
      root,
    );
  });

  it('keeps untrusted path separators out of the user and video segments', () => {
    const root = videoObjectRoot('user/path@Example.com', '..\\Holiday / Clip.mov', 'video-1');

    expect(root).toBe('user%2Fpath@example.com/Original/clip--video-1');
  });

  it('uses a fallback for names without Latin letters or digits', () => {
    expect(videoObjectRoot(' USER+demo@Example.com ', '!!!.mp4', 'video-1')).toBe(
      'user+demo@example.com/Original/video--video-1',
    );
  });

  it('keeps a dotfile name intact when it has no extension separator', () => {
    expect(videoObjectRoot('user@example.com', '.hidden', 'video-2')).toBe(
      'user@example.com/Original/hidden--video-2',
    );
  });
});
