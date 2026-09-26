import {
  VideoNotFoundError,
  VideoUploadInvalidStateError,
} from '../errors/video-errors.js';
import type {
  IdentifierGenerator,
  VideoConfirmationUnitOfWork,
  VideoRepository,
  VideoStorage,
  VideoUploadedEvent,
} from '../ports/video-ports.js';
import type { Video } from '../../domain/video.js';
import type { VideoId, VideoOwnerId } from '../../domain/video-id.js';

export class ConfirmVideoUpload {
  public constructor(
    private readonly videoRepository: VideoRepository,
    private readonly videoStorage: VideoStorage,
    private readonly unitOfWork: VideoConfirmationUnitOfWork,
    private readonly identifierGenerator: IdentifierGenerator,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async execute(
    input: Readonly<{
      ownerId: VideoOwnerId;
      videoId: VideoId;
      correlationId: string;
    }>,
  ): Promise<Video> {
    const video = await this.videoRepository.findOwnedById(
      input.ownerId,
      input.videoId,
    );

    if (video === null) {
      throw new VideoNotFoundError();
    }

    if (video.snapshot.status !== 'AWAITING_UPLOAD') {
      return video;
    }

    const object = await this.videoStorage.statObject(
      video.snapshot.storageKey,
    );
    const now = this.clock();
    video.confirm(object, now);
    const event: VideoUploadedEvent = {
      eventId: this.identifierGenerator.generate(),
      eventType: 'VideoUploaded',
      eventVersion: 1,
      occurredAt: now,
      correlationId: input.correlationId,
      payload: {
        videoId: video.snapshot.id.toString(),
        storageKey: video.snapshot.storageKey,
        objectVersion: object.version,
        contentType: object.contentType,
        sizeBytes: object.sizeBytes,
      },
    };

    if (await this.unitOfWork.confirm(video, event)) {
      return video;
    }

    const concurrentResult = await this.videoRepository.findOwnedById(
      input.ownerId,
      input.videoId,
    );

    if (
      concurrentResult !== null &&
      concurrentResult.snapshot.status !== 'AWAITING_UPLOAD'
    ) {
      return concurrentResult;
    }

    throw new VideoUploadInvalidStateError();
  }
}
