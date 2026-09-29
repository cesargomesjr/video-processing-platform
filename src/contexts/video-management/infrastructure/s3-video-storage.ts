import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

  public async get(key: string): Promise<Buffer> {
    const output = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    const body = output.Body === undefined ? null : await output.Body.transformToByteArray();
    return body === null ? Buffer.alloc(0) : Buffer.from(body);
  }
}
