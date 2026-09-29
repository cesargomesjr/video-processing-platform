import { GetVideoStatusUseCase } from '../../../src/contexts/video-management/application/get-video-status.use-case';
import { ListUserVideosUseCase } from '../../../src/contexts/video-management/application/list-user-videos.use-case';
import { RequestDownloadUseCase } from '../../../src/contexts/video-management/application/request-download.use-case';
import { UploadVideoUseCase } from '../../../src/contexts/video-management/application/upload-video.use-case';
import { VideosController } from '../../../src/contexts/video-management/presentation/videos.controller';
import { MetricsService } from '../../../src/platform/metrics/metrics.service';
import { RateLimitService } from '../../../src/platform/rate-limit/rate-limit.service';

describe('VideosController list', () => {
  const listUserVideos = { execute: jest.fn() };
  const controller = new VideosController(
    {} as UploadVideoUseCase,
    listUserVideos as unknown as ListUserVideosUseCase,
    {} as GetVideoStatusUseCase,
    {} as RequestDownloadUseCase,
    {} as RateLimitService,
    {} as MetricsService,
  );

  beforeEach(() => jest.resetAllMocks());

  it.each([
    ['PENDING', 10],
    ['ANALYZED', 30],
    ['PROCESSING', 65],
    ['AGGREGATING', 85],
    ['COMPLETED', 100],
    ['FAILED', 100],
  ] as const)('reports %s videos at %i percent progress', async (status, progress) => {
    listUserVideos.execute.mockResolvedValue({
      total: 1,
      items: [
        {
          id: { value: 'video-1' },
          status: { value: status },
          originalName: 'movie.mp4',
          format: { value: 'mp4' },
          size: { bytes: 5 },
          durationMs: null,
        },
      ],
    });

    await expect(controller.list({ user: { id: 'user-1' } }, 2, 5)).resolves.toEqual({
      total: 1,
      items: [
        {
          videoId: 'video-1',
          status,
          originalName: 'movie.mp4',
          format: 'mp4',
          sizeBytes: 5,
          durationMs: null,
          progress,
        },
      ],
    });
    expect(listUserVideos.execute).toHaveBeenCalledWith({
      ownerId: 'user-1',
      page: 2,
      pageSize: 5,
    });
  });
});
