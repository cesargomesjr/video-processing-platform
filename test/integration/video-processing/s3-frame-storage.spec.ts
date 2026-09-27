import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

import { S3FrameStorage } from '../../../src/contexts/video-processing/infrastructure/s3-frame-storage';

describe('S3FrameStorage', () => {
  const bucket = 'fiapx-frames-test';

  let container: StartedTestContainer;
  let client: S3Client;
  let storage: S3FrameStorage;

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

    storage = new S3FrameStorage({
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

  it('puts, gets and lists frames by prefix', async () => {
    await storage.put('frames/video-1/frame_000001.png', Buffer.from('b'));
    await storage.put('frames/video-1/frame_000000.png', Buffer.from('a'));
    await storage.put('frames/video-2/frame_000000.png', Buffer.from('c'));

    await expect(storage.get('frames/video-1/frame_000001.png')).resolves.toEqual(Buffer.from('b'));
    await expect(storage.list('frames/video-1/')).resolves.toEqual([
      'frames/video-1/frame_000000.png',
      'frames/video-1/frame_000001.png',
    ]);
  });
});
