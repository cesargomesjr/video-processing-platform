import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  PayloadTooLargeException,
  Param,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
  UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from '../../../identity/presentation/http/authentication.guard.js';
import type { AuthenticatedRequest } from '../../../identity/presentation/http/authenticated-request.js';
import {
  InvalidVideoCursorError,
  VideoNotFoundError,
  VideoStorageUnavailableError,
  VideoUploadInvalidStateError,
  VideoUploadNotFoundError,
} from '../../application/errors/video-errors.js';
import { ConfirmVideoUpload } from '../../application/use-cases/confirm-video-upload.js';
import { CreateVideoUpload } from '../../application/use-cases/create-video-upload.js';
import {
  GetUserVideo,
  ListUserVideos,
} from '../../application/use-cases/query-videos.js';
import { VideoId, VideoOwnerId } from '../../domain/video-id.js';
import {
  InvalidVideoUploadError,
  UnsupportedVideoTypeError,
  VideoTooLargeError,
} from '../../domain/video-upload-metadata.js';
import { VideoUploadMismatchError, type Video } from '../../domain/video.js';
import { decodeVideoCursor, encodeVideoCursor } from './video-cursor.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function ownerFrom(request: AuthenticatedRequest): VideoOwnerId {
  const principal = request.authenticatedPrincipal;
  if (principal === undefined) throw new VideoNotFoundError();
  return VideoOwnerId.create(principal.userId.toString());
}

function parseCreateBody(body: unknown): {
  filename: string;
  contentType: string;
  sizeBytes: number;
} {
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    throw new InvalidVideoUploadError('Invalid request body');
  const value = body as Record<string, unknown>;
  const keys = Object.keys(value).sort().join(',');
  if (
    keys !== 'contentType,filename,sizeBytes' ||
    typeof value.filename !== 'string' ||
    typeof value.contentType !== 'string' ||
    typeof value.sizeBytes !== 'number'
  ) {
    throw new InvalidVideoUploadError('Invalid request body');
  }
  return {
    filename: value.filename,
    contentType: value.contentType,
    sizeBytes: value.sizeBytes,
  };
}

function parseLimit(value: string | undefined): number {
  if (value === undefined) return 20;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new BadRequestException({
      code: 'INVALID_VIDEO_REQUEST',
      message: 'limit must be between 1 and 100',
    });
  return limit;
}

function parseVideoId(value: string): VideoId {
  if (!UUID_PATTERN.test(value))
    throw new InvalidVideoUploadError('Invalid video ID');
  return VideoId.create(value);
}

function correlationId(value: string | undefined): string {
  return value !== undefined && UUID_PATTERN.test(value)
    ? value.toLowerCase()
    : randomUUID();
}

function response(video: Video): Record<string, unknown> {
  const p = video.snapshot;
  return {
    id: p.id.toString(),
    filename: p.originalFilename,
    contentType: p.verifiedContentType ?? p.declaredContentType,
    sizeBytes: p.verifiedSizeBytes ?? p.declaredSizeBytes,
    status: p.status,
    progress: p.progress,
    createdAt: p.createdAt.toISOString(),
    uploadedAt: p.uploadedAt?.toISOString() ?? null,
  };
}

function translate(error: unknown): never {
  if (error instanceof VideoNotFoundError)
    throw new NotFoundException({
      code: 'VIDEO_NOT_FOUND',
      message: error.message,
    });
  if (error instanceof VideoUploadNotFoundError)
    throw new ConflictException({
      code: 'VIDEO_UPLOAD_NOT_FOUND',
      message: error.message,
    });
  if (error instanceof VideoUploadInvalidStateError)
    throw new ConflictException({
      code: 'VIDEO_UPLOAD_INVALID_STATE',
      message: error.message,
    });
  if (error instanceof VideoUploadMismatchError)
    throw new ConflictException({
      code: 'VIDEO_UPLOAD_MISMATCH',
      message: error.message,
    });
  if (error instanceof VideoStorageUnavailableError)
    throw new ServiceUnavailableException({
      code: 'VIDEO_STORAGE_UNAVAILABLE',
      message: error.message,
    });
  if (error instanceof UnsupportedVideoTypeError)
    throw new UnsupportedMediaTypeException({
      code: 'UNSUPPORTED_VIDEO_TYPE',
      message: error.message,
    });
  if (error instanceof VideoTooLargeError)
    throw new PayloadTooLargeException({
      code: 'VIDEO_TOO_LARGE',
      message: error.message,
    });
  if (
    error instanceof InvalidVideoUploadError ||
    error instanceof InvalidVideoCursorError
  )
    throw new BadRequestException({
      code:
        error instanceof InvalidVideoCursorError
          ? 'INVALID_CURSOR'
          : 'INVALID_VIDEO_REQUEST',
      message: error.message,
    });
  throw error;
}

@Controller('videos')
@UseGuards(AuthenticationGuard)
export class VideoController {
  public constructor(
    private readonly createVideoUpload: CreateVideoUpload,
    private readonly confirmVideoUpload: ConfirmVideoUpload,
    private readonly listUserVideos: ListUserVideos,
    private readonly getUserVideo: GetUserVideo,
  ) {}

  @Post()
  public async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<Record<string, unknown>> {
    try {
      const created = await this.createVideoUpload.execute({
        ownerId: ownerFrom(request),
        ...parseCreateBody(body),
      });
      return { ...response(created.video), upload: created.upload };
    } catch (error: unknown) {
      return translate(error);
    }
  }

  @Post(':videoId/upload-completed')
  @HttpCode(200)
  public async confirm(
    @Req() request: AuthenticatedRequest,
    @Param('videoId') videoId: string,
    @Headers('x-correlation-id') headerCorrelationId: string | undefined,
  ): Promise<Record<string, unknown>> {
    try {
      const effectiveCorrelationId = correlationId(headerCorrelationId);
      const video = await this.confirmVideoUpload.execute({
        ownerId: ownerFrom(request),
        videoId: parseVideoId(videoId),
        correlationId: effectiveCorrelationId,
      });
      return { ...response(video), correlationId: effectiveCorrelationId };
    } catch (error: unknown) {
      return translate(error);
    }
  }

  @Get()
  public async list(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limitValue: string | undefined,
    @Query('cursor') cursorValue: string | undefined,
  ): Promise<Record<string, unknown>> {
    try {
      const page = await this.listUserVideos.execute({
        ownerId: ownerFrom(request),
        limit: parseLimit(limitValue),
        cursor: decodeVideoCursor(cursorValue),
      });
      return {
        items: page.items.map(response),
        page: {
          nextCursor:
            page.nextCursor === null
              ? null
              : encodeVideoCursor(page.nextCursor),
        },
      };
    } catch (error: unknown) {
      return translate(error);
    }
  }

  @Get(':videoId')
  public async detail(
    @Req() request: AuthenticatedRequest,
    @Param('videoId') videoId: string,
  ): Promise<Record<string, unknown>> {
    try {
      return response(
        await this.getUserVideo.execute(
          ownerFrom(request),
          parseVideoId(videoId),
        ),
      );
    } catch (error: unknown) {
      return translate(error);
    }
  }
}
