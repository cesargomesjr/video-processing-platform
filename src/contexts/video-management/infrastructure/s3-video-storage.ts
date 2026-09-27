import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { VideoStorage } from '../application/ports/video-storage';
import { S3ConnectionOptions } from './s3-connection-options';

export class S3VideoStorage implements VideoStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  public constructor(options: S3ConnectionOptions) {
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      credentials: {
        accessKeyId: options.accessKey,
        secretAccessKey: options.secretKey,
      },
      forcePathStyle: true,
    });
    this.bucket = options.bucket;
  }

  public async put(key: string, content: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: content,
      }),
    );
  }
}
