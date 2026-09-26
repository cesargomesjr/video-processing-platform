import {
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  VideoStorage,
  type SignedUpload,
} from '../../application/ports/video-ports.js';
import {
  VideoStorageUnavailableError,
  VideoUploadNotFoundError,
} from '../../application/errors/video-errors.js';
import type { VerifiedVideoObject } from '../../domain/video.js';

type S3OperationsClient = Pick<S3Client, 'send'>;

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error.name === 'NoSuchKey' ||
      error.name === 'NotFound' ||
      error.name === 'NoSuchObject')
  );
}

export class MinioVideoStorage extends VideoStorage {
  public constructor(
    private readonly operationsClient: S3OperationsClient,
    private readonly signingClient: S3Client,
    private readonly bucket: string,
  ) {
    super();
  }

  public override async createUpload(
    storageKey: string,
    contentType: string,
    expiresAt: Date,
  ): Promise<SignedUpload> {
    const expiresIn = Math.max(
      1,
      Math.floor((expiresAt.getTime() - Date.now()) / 1_000),
    );
    try {
      const url = await getSignedUrl(
        this.signingClient,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          ContentType: contentType,
        }),
        { expiresIn },
      );
      return {
        method: 'PUT',
        url,
        headers: { 'content-type': contentType },
        expiresAt,
      };
    } catch {
      throw new VideoStorageUnavailableError();
    }
  }

  public override async statObject(
    storageKey: string,
  ): Promise<VerifiedVideoObject> {
    try {
      const result = await this.operationsClient.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      );
      return {
        version: result.VersionId ?? '',
        etag: result.ETag?.replaceAll('"', '') ?? '',
        contentType: result.ContentType ?? '',
        sizeBytes: result.ContentLength ?? 0,
      };
    } catch (error: unknown) {
      if (isNotFound(error)) throw new VideoUploadNotFoundError();
      throw new VideoStorageUnavailableError();
    }
  }
}
