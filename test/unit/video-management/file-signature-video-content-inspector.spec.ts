import { FileSignatureVideoContentInspector } from '../../../src/contexts/video-management/infrastructure/file-signature-video-content-inspector';
import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';

const inspector = new FileSignatureVideoContentInspector();

describe('FileSignatureVideoContentInspector', () => {
  it.each([
    ['mp4', Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.alloc(4)])],
    ['mov', Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.alloc(4)])],
    ['avi', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('AVI ')])],
    ['mkv', Buffer.from([0x1a, 0x45, 0xdf, 0xa3])],
    ['webm', Buffer.from([0x1a, 0x45, 0xdf, 0xa3])],
    ['flv', Buffer.from('FLV')],
  ])('accepts the %s signature', async (extension, content) => {
    await expect(inspector.matchesFormat(content, VideoFormat.create(extension))).resolves.toBe(
      true,
    );
  });

  it('accepts the wmv signature', async () => {
    const wmv = Buffer.from([
      0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce,
      0x6c,
    ]);

    await expect(inspector.matchesFormat(wmv, VideoFormat.create('wmv'))).resolves.toBe(true);
  });

  it('rejects content that does not match the declared format', async () => {
    await expect(
      inspector.matchesFormat(Buffer.from('not-mp4'), VideoFormat.create('mp4')),
    ).resolves.toBe(false);
  });
});
