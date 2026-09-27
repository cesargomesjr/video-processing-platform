import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { JwtGuard } from '../../identity/presentation/jwt.guard';
import { RateLimitExceededError } from '../../../platform/rate-limit/rate-limiter';
import { MetricsService } from '../../../platform/metrics/metrics.service';
import { RateLimitService } from '../../../platform/rate-limit/rate-limit.service';
import {
  InvalidPaginationError,
  VideoContentMismatchError,
  VideoNotCompletedError,
  VideoNotFoundError,
  VideoStorageWriteError,
  VideoTooLargeError,
} from '../application/errors';
import { DownloadUrl, RequestDownloadUseCase } from '../application/request-download.use-case';
import { GetVideoStatusUseCase, VideoStatusView } from '../application/get-video-status.use-case';
import { ListUserVideosUseCase } from '../application/list-user-videos.use-case';
import { UploadVideoResult, UploadVideoUseCase } from '../application/upload-video.use-case';
import { InvalidVideoIdError } from '../domain/video-id';
import { UnsupportedVideoFormatError } from '../domain/video-format';
import { VideoNotAccessibleError } from '../domain/video-ownership-policy';
import { VideoStatusValue } from '../domain/video-status';

interface AuthenticatedRequest {
  user: { id: string };
}

@Controller('videos')
export class VideosController {
  public constructor(
    private readonly uploadVideo: UploadVideoUseCase,
    private readonly listUserVideos: ListUserVideosUseCase,
    private readonly getVideoStatus: GetVideoStatusUseCase,
    private readonly requestDownload: RequestDownloadUseCase,
    private readonly rateLimitService: RateLimitService,
    private readonly metrics: MetricsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtGuard)
  @UseInterceptors(FileInterceptor('file'))
  public async upload(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UploadVideoResult> {
    if (file === undefined) {
      throw new BadRequestException('file is required');
    }

    try {
      await this.rateLimitService.assertUploadAllowed(request.user.id);
    } catch (error: unknown) {
      if (error instanceof RateLimitExceededError) {
        response.setHeader('Retry-After', String(error.retryAfterSeconds));
        throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
      }

      throw error;
    }

    try {
      const result = await this.uploadVideo.execute({
        ownerId: request.user.id,
        originalName: file.originalname,
        content: file.buffer,
      });
      this.metrics.incrementVideos('PENDING');
      return result;
    } catch (error: unknown) {
      this.toHttpError(error);
    }
  }

  @Get()
  @UseGuards(JwtGuard)
  public async list(
    @Req() request: AuthenticatedRequest,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ): Promise<{ items: Array<{ videoId: string; status: VideoStatusValue }>; total: number }> {
    const result = await this.listUserVideos.execute({
      ownerId: request.user.id,
      page,
      pageSize,
    });

    return {
      items: result.items.map((video) => ({
        videoId: video.id.value,
        status: video.status.value,
      })),
      total: result.total,
    };
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  public async status(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<VideoStatusView> {
    try {
      return await this.getVideoStatus.execute({ videoId: id, userId: request.user.id });
    } catch (error: unknown) {
      this.toHttpError(error);
    }
  }

  @Get(':id/download')
  @UseGuards(JwtGuard)
  public async download(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<DownloadUrl> {
    try {
      return await this.requestDownload.execute({ videoId: id, userId: request.user.id });
    } catch (error: unknown) {
      this.toHttpError(error);
    }
  }

  private toHttpError(error: unknown): never {
    if (
      error instanceof UnsupportedVideoFormatError ||
      error instanceof VideoContentMismatchError ||
      error instanceof InvalidPaginationError ||
      error instanceof InvalidVideoIdError
    ) {
      throw new BadRequestException(error.message);
    }

    if (error instanceof VideoTooLargeError) {
      throw new PayloadTooLargeException(error.message);
    }

    if (error instanceof VideoNotFoundError || error instanceof VideoNotAccessibleError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof VideoNotCompletedError) {
      throw new ConflictException(error.message);
    }

    if (error instanceof VideoStorageWriteError) {
      throw new ServiceUnavailableException(error.message);
    }

    throw error;
  }
}
