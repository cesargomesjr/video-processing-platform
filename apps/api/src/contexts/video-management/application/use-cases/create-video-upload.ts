import { Video } from '../../domain/video.js';
import { VideoId, type VideoOwnerId } from '../../domain/video-id.js';
import { VideoUploadMetadata } from '../../domain/video-upload-metadata.js';
import type {
  IdentifierGenerator,
  SignedUpload,
  VideoRepository,
  VideoStorage,
} from '../ports/video-ports.js';

export type CreatedVideoUpload = Readonly<{
  video: Video;
  upload: SignedUpload;
}>;

export class CreateVideoUpload {
  public constructor(
    private readonly videoRepository: VideoRepository,
    private readonly videoStorage: VideoStorage,
    private readonly identifierGenerator: IdentifierGenerator,
    private readonly maximumSizeBytes: number,
    private readonly uploadTtlSeconds: number,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async execute(
    input: Readonly<{
      ownerId: VideoOwnerId;
      filename: string;
      contentType: string;
      sizeBytes: number;
    }>,
  ): Promise<CreatedVideoUpload> {
    const metadata = VideoUploadMetadata.create(input, this.maximumSizeBytes);
    const now = this.clock();
    const id = VideoId.create(this.identifierGenerator.generate());
    const uploadExpiresAt = new Date(
      now.getTime() + this.uploadTtlSeconds * 1_000,
    );
    const storageKey = `videos/${id.toString()}/original.${metadata.canonicalExtension}`;
    const video = Video.create({
      id,
      ownerId: input.ownerId,
      originalFilename: metadata.filename,
      declaredContentType: metadata.contentType,
      declaredSizeBytes: metadata.sizeBytes,
      storageKey,
      uploadExpiresAt,
      now,
    });
    const upload = await this.videoStorage.createUpload(
      storageKey,
      metadata.contentType,
      uploadExpiresAt,
    );

    await this.videoRepository.create(video);

    return { video, upload };
  }
}
