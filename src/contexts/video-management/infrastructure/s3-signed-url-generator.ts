import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { SignedUrl, SignedUrlGenerator } from '../application/ports/signed-url-generator';
import { S3ConnectionOptions } from './s3-connection-options';

export class S3SignedUrlGenerator implements SignedUrlGenerator {
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

  public async generate(key: string, expiresInSeconds: number): Promise<SignedUrl> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });

    return {
      url,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }
}
