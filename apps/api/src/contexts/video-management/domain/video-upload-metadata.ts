export type SupportedVideoContentType =
  | 'video/mp4'
  | 'video/quicktime'
  | 'video/x-matroska'
  | 'video/webm';

const EXTENSIONS: Readonly<Record<SupportedVideoContentType, string>> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
  'video/webm': 'webm',
};

const CONTROL_OR_PATH_PATTERN = /[\u0000-\u001f\u007f/\\]/u;

export class InvalidVideoUploadError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidVideoUploadError';
  }
}

export class UnsupportedVideoTypeError extends Error {
  public constructor() {
    super('Unsupported video content type or filename extension');
    this.name = 'UnsupportedVideoTypeError';
  }
}

export class VideoTooLargeError extends Error {
  public constructor() {
    super('Video exceeds the configured upload size');
    this.name = 'VideoTooLargeError';
  }
}

export class VideoUploadMetadata {
  private constructor(
    public readonly filename: string,
    public readonly contentType: SupportedVideoContentType,
    public readonly sizeBytes: number,
    public readonly canonicalExtension: string,
  ) {}

  public static create(
    input: Readonly<{
      filename: string;
      contentType: string;
      sizeBytes: number;
    }>,
    maximumSizeBytes: number,
  ): VideoUploadMetadata {
    const filename = input.filename.trim();

    if (
      filename.length === 0 ||
      filename.length > 255 ||
      CONTROL_OR_PATH_PATTERN.test(filename)
    ) {
      throw new InvalidVideoUploadError('Invalid video filename');
    }

    if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0) {
      throw new InvalidVideoUploadError('sizeBytes must be a positive integer');
    }

    if (input.sizeBytes > maximumSizeBytes) {
      throw new VideoTooLargeError();
    }

    if (!(input.contentType in EXTENSIONS)) {
      throw new UnsupportedVideoTypeError();
    }

    const contentType = input.contentType as SupportedVideoContentType;
    const canonicalExtension = EXTENSIONS[contentType];
    const filenameExtension = filename.split('.').pop()?.toLowerCase();

    if (filenameExtension !== canonicalExtension) {
      throw new UnsupportedVideoTypeError();
    }

    return new VideoUploadMetadata(
      filename,
      contentType,
      input.sizeBytes,
      canonicalExtension,
    );
  }
}
