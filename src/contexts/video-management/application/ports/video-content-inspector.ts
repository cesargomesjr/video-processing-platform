import { VideoFormat } from '../../domain/video-format';

export interface VideoContentInspector {
  matchesFormat(content: Buffer, format: VideoFormat): Promise<boolean>;
}
