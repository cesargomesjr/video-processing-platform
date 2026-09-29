import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

import { Video } from '../../../src/contexts/video-management/domain/video';
import { VideoFormat } from '../../../src/contexts/video-management/domain/video-format';
import { VideoId } from '../../../src/contexts/video-management/domain/video-id';
import { VideoSize } from '../../../src/contexts/video-management/domain/video-size';
import { VideoStatus } from '../../../src/contexts/video-management/domain/video-status';
import { PostgresVideoRepository } from '../../../src/contexts/video-management/infrastructure/typeorm/postgres-video.repository';
import { VideoEntity } from '../../../src/contexts/video-management/infrastructure/typeorm/video.entity';

const OWNER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OWNER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const VIDEO_A1 = '11111111-1111-1111-1111-111111111111';
const VIDEO_A2 = '22222222-2222-2222-2222-222222222222';
const VIDEO_B1 = '33333333-3333-3333-3333-333333333333';
const MISSING = '99999999-9999-9999-9999-999999999999';

function video(ownerId: string, videoId: string): Video {
  return Video.create({
    id: VideoId.create(videoId),
    ownerId,
    originalName: 'movie.mp4',
    format: VideoFormat.create('mp4'),
    size: VideoSize.create(1024, 1024 * 1024),
    storageKey: `original/${ownerId}/${videoId}.mp4`,
  });
}

describe('PostgresVideoRepository', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repository: PostgresVideoRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      entities: [VideoEntity],
      synchronize: true,
    });

    await dataSource.initialize();
    repository = new PostgresVideoRepository(dataSource);
  }, 120_000);

  beforeEach(async () => {
    await dataSource.getRepository(VideoEntity).clear();
  });

  afterAll(async () => {
    if (dataSource !== undefined && dataSource.isInitialized) {
      await dataSource.destroy();
    }

    if (container !== undefined) {
      await container.stop();
    }
  });

  it('saves and finds a video by id', async () => {
    await repository.save(video(OWNER_A, VIDEO_A1));

    const found = await repository.findById(VideoId.create(VIDEO_A1));

    expect(found).not.toBeNull();
    expect(found?.ownerId).toBe(OWNER_A);
    expect(found?.format.value).toBe('mp4');
    expect(found?.size.bytes).toBe(1024);
    expect(found?.storageKey).toBe(`original/${OWNER_A}/${VIDEO_A1}.mp4`);
    expect(found?.status).toBe(VideoStatus.PENDING);
  });

  it('returns null when the video does not exist', async () => {
    await expect(repository.findById(VideoId.create(MISSING))).resolves.toBeNull();
  });

  it('finds by owner with pagination and isolation', async () => {
    await repository.save(video(OWNER_A, VIDEO_A1));
    await repository.save(video(OWNER_A, VIDEO_A2));
    await repository.save(video(OWNER_B, VIDEO_B1));

    const page = await repository.findByOwnerId(OWNER_A, 1, 10);

    expect(page.total).toBe(2);
    expect(page.items.map((item) => item.id.value).sort()).toEqual([VIDEO_A1, VIDEO_A2]);
  });

  it('deletes a video', async () => {
    await repository.save(video(OWNER_A, VIDEO_A1));
    await repository.delete(VideoId.create(VIDEO_A1));

    await expect(repository.findById(VideoId.create(VIDEO_A1))).resolves.toBeNull();
  });
});
