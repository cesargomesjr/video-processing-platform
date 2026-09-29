import { VideoContentInspector } from '../../../../src/contexts/video-management/application/ports/video-content-inspector';
import { VideoFormat } from '../../../../src/contexts/video-management/domain/video-format';

export class FakeVideoContentInspector implements VideoContentInspector {
  public matches = true;

  public matchesFormat(content: Buffer, format: VideoFormat): Promise<boolean> {
    return Promise.resolve(this.matches && content.length > 0 && format.value.length > 0);
  }
}
