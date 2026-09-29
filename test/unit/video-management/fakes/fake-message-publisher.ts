import {
  MessagePublisher,
  VideoUploadedEvent,
} from '../../../../src/contexts/video-management/application/ports/message-publisher';

export class FakeMessagePublisher implements MessagePublisher {
  public readonly published: VideoUploadedEvent[] = [];
  public shouldFail = false;

  public publishVideoUploaded(event: VideoUploadedEvent): Promise<void> {
    if (this.shouldFail) {
      return Promise.reject(new Error('publisher unavailable'));
    }

    this.published.push(event);
    return Promise.resolve();
  }
}
