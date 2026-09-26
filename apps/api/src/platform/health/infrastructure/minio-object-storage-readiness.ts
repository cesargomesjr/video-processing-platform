import { HeadBucketCommand, type S3Client } from '@aws-sdk/client-s3';
import { ObjectStorageReadiness } from '../application/service-readiness.js';

export class MinioObjectStorageReadiness extends ObjectStorageReadiness {
  public constructor(
    private readonly client: Pick<S3Client, 'send'>,
    private readonly bucket: string,
  ) {
    super();
  }

  public override async isReady(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }
}
