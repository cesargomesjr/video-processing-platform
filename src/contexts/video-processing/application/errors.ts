import { DomainError } from '../domain/domain-error';

export class VideoProcessingError extends DomainError {
  public constructor(message: string) {
    super(message);
  }
}
