import { CreateBucketCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

import { S3VideoStorage } from '../../../src/contexts/video-management/infrastructure/s3-video-storage';

describe('S3VideoStorage', () => {
  const bucket = 'fiapx-test';

  let container: StartedTestContainer;
  let client: S3Client;
  let storage: S3VideoStorage;

  beforeAll(async () => {
    container = await new GenericContainer('alpine/minio:latest-release')
      .withExposedPorts(9000)
      .withEnvironment({
        MINIO_ROOT_USER: 'minioadmin',
        MINIO_ROOT_PASSWORD: 'minioadmin',
      })
      .withUser('root')
      .withEntrypoint(['/bin/sh', '-c'])
      .withCommand([
        'chown -R minio:minio /data && exec su -s /bin/sh minio -c "exec minio server /data --console-address :9001"',
      ])
      .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000))
      .start();

    const endpoint = `http://${container.getHost()}:${container.getMappedPort(9000)}`;

    client = new S3Client({
      endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin',
      },
      forcePathStyle: true,
    });

    await client.send(new CreateBucketCommand({ Bucket: bucket }));

    storage = new S3VideoStorage({
      endpoint,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
      bucket,
      region: 'us-east-1',
    });
  }, 120_000);

  afterAll(async () => {
    if (client !== undefined) {
      client.destroy();
    }

    if (container !== undefined) {
      await container.stop();
    }
  });

  it('stores an object and retrieves it by key', async () => {
    const content = Buffer.from('video-content');
    const key = 'original/user/video.mp4';

    await storage.put(key, content);

    const output = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = output.Body === undefined ? null : await output.Body.transformToByteArray();

    expect(body).not.toBeNull();
    expect(body === null ? null : Buffer.from(body)).toEqual(content);
  });
});
