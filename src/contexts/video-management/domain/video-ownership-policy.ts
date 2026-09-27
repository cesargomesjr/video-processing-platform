import { DomainError } from './domain-error';
import { Video } from './video';

export class VideoNotAccessibleError extends DomainError {
  public constructor(videoId: string) {
    super(`Video is not accessible: ${videoId}`);
  }
}

export class VideoOwnershipPolicy {
  public assertCanAccess(video: Video, userId: string): void {
    if (!video.belongsTo(userId)) {
      throw new VideoNotAccessibleError(video.id.value);
    }
  }
}
