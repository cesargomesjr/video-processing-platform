import { VideoContentInspector } from '../application/ports/video-content-inspector';
import { VideoFormat } from '../domain/video-format';

const WMV_SIGNATURE = Buffer.from([
  0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c,
]);

export class FileSignatureVideoContentInspector implements VideoContentInspector {
  public matchesFormat(content: Buffer, format: VideoFormat): Promise<boolean> {
    return Promise.resolve(this.matches(content, format));
  }

  private matches(content: Buffer, format: VideoFormat): boolean {
    switch (format.value) {
      case 'mp4':
      case 'mov':
        return content.length >= 8 && content.toString('ascii', 4, 8) === 'ftyp';
      case 'avi':
        return (
          content.length >= 12 &&
          content.toString('ascii', 0, 4) === 'RIFF' &&
          content.toString('ascii', 8, 12) === 'AVI '
        );
      case 'mkv':
      case 'webm':
        return content.length >= 4 && content.readUInt32BE(0) === 0x1a45dfa3;
      case 'flv':
        return content.length >= 3 && content.toString('ascii', 0, 3) === 'FLV';
      case 'wmv':
        return (
          content.length >= WMV_SIGNATURE.length &&
          content.subarray(0, WMV_SIGNATURE.length).equals(WMV_SIGNATURE)
        );
      default:
        return false;
    }
  }
}
