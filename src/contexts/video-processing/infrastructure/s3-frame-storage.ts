import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { FrameStorage } from '../application/ports/frame-storage';

interface S3FrameStorageOptions {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
}

export class S3FrameStorage implements FrameStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  public constructor(options: S3FrameStorageOptions) {
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

  public async list(prefix: string): Promise<string[]> {
    const output = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      }),
    );

    return (output.Contents ?? [])
      .map((object) => object.Key ?? '')
      .filter((key) => key.length > 0)
      .sort();
  }
}
