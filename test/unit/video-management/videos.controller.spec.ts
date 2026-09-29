import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Response } from 'express';

import {
  InvalidPaginationError,
  VideoContentMismatchError,
  VideoNotCompletedError,
  VideoNotFoundError,
  VideoStorageWriteError,
  VideoTooLargeError,
} from '../../../src/contexts/video-management/application/errors';
import { GetVideoStatusUseCase } from '../../../src/contexts/video-management/application/get-video-status.use-case';
import { ListUserVideosUseCase } from '../../../src/contexts/video-management/application/list-user-videos.use-case';
import { RequestDownloadUseCase } from '../../../src/contexts/video-management/application/request-download.use-case';
import { UploadVideoUseCase } from '../../../src/contexts/video-management/application/upload-video.use-case';
import { InvalidVideoIdError } from '../../../src/contexts/video-management/domain/video-id';
import { UnsupportedVideoFormatError } from '../../../src/contexts/video-management/domain/video-format';
import { VideoNotAccessibleError } from '../../../src/contexts/video-management/domain/video-ownership-policy';
import { VideosController } from '../../../src/contexts/video-management/presentation/videos.controller';
import { MetricsService } from '../../../src/platform/metrics/metrics.service';
import { RateLimitService } from '../../../src/platform/rate-limit/rate-limit.service';
import { RateLimitExceededError } from '../../../src/platform/rate-limit/rate-limiter';

describe('VideosController', () => {
  const request = { user: { id: 'user-1' } };
  const file = { originalname: 'movie.mp4', buffer: Buffer.from('video') } as Express.Multer.File;
  const setHeader = jest.fn();
  const response = { setHeader } as unknown as Response;
  const uploadVideo = { execute: jest.fn() };
  const listUserVideos = { execute: jest.fn() };
  const getVideoStatus = { execute: jest.fn() };
  const requestDownload = { execute: jest.fn() };
  const rateLimit = { assertUploadAllowed: jest.fn() };
  const metrics = { incrementVideos: jest.fn() };
  const controller = new VideosController(
    uploadVideo as unknown as UploadVideoUseCase,
    listUserVideos as unknown as ListUserVideosUseCase,
    getVideoStatus as unknown as GetVideoStatusUseCase,
    requestDownload as unknown as RequestDownloadUseCase,
    rateLimit as unknown as RateLimitService,
    metrics as unknown as MetricsService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    rateLimit.assertUploadAllowed.mockResolvedValue(undefined);
  });

  it('requires a file before consuming the upload quota', async () => {
    await expect(controller.upload(request, response, undefined)).rejects.toThrow(
      BadRequestException,
    );
    expect(rateLimit.assertUploadAllowed).not.toHaveBeenCalled();
  });

  it('returns 429 with Retry-After without creating a video when the quota is exceeded', async () => {
    rateLimit.assertUploadAllowed.mockRejectedValue(new RateLimitExceededError(42));

    await expect(controller.upload(request, response, file)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '42');
    expect(uploadVideo.execute).not.toHaveBeenCalled();
  });

  it('does not convert unexpected rate limiter failures to 429', async () => {
    const failure = new Error('Redis unavailable');
    rateLimit.assertUploadAllowed.mockRejectedValue(failure);

    await expect(controller.upload(request, response, file)).rejects.toBe(failure);
  });

  it('uploads a video and records the pending metric', async () => {
    const result = { videoId: 'video-1', status: 'PENDING' };
    uploadVideo.execute.mockResolvedValue(result);

    await expect(controller.upload(request, response, file)).resolves.toBe(result);
    expect(uploadVideo.execute).toHaveBeenCalledWith({
      ownerId: 'user-1',
      originalName: 'movie.mp4',
      content: file.buffer,
    });
    expect(metrics.incrementVideos).toHaveBeenCalledWith('PENDING');
  });

  it.each([
    [new UnsupportedVideoFormatError('exe'), BadRequestException],
    [new VideoContentMismatchError('mp4'), BadRequestException],
    [new InvalidPaginationError(), BadRequestException],
    [new InvalidVideoIdError(), BadRequestException],
    [new VideoTooLargeError(11, 10), PayloadTooLargeException],
    [new VideoNotFoundError(), NotFoundException],
    [new VideoNotAccessibleError('video-1'), NotFoundException],
    [new VideoNotCompletedError('PENDING'), ConflictException],
    [new VideoStorageWriteError(), ServiceUnavailableException],
  ])('maps upload error case %# to HTTP exception', async (error, exception) => {
    uploadVideo.execute.mockRejectedValue(error);

    await expect(controller.upload(request, response, file)).rejects.toThrow(exception);
  });

  it('preserves unexpected upload failures', async () => {
    const failure = new Error('unexpected');
    uploadVideo.execute.mockRejectedValue(failure);

    await expect(controller.upload(request, response, file)).rejects.toBe(failure);
  });

  it('maps status and download errors to HTTP responses', async () => {
    getVideoStatus.execute.mockRejectedValue(new VideoNotFoundError());
    requestDownload.execute.mockRejectedValue(new VideoNotCompletedError('PROCESSING'));

    await expect(controller.status(request, 'video-1')).rejects.toThrow(NotFoundException);
    await expect(controller.download(request, 'video-1')).rejects.toThrow(ConflictException);
  });
});
