import { DomainError } from './domain-error';

export const SUPPORTED_VIDEO_EXTENSIONS = [
  'mp4',
  'avi',
  'mov',
  'mkv',
  'wmv',
  'flv',
  'webm',
] as const;

export type SupportedVideoExtension = (typeof SUPPORTED_VIDEO_EXTENSIONS)[number];

export class UnsupportedVideoFormatError extends DomainError {
  public constructor(format: string) {
    super(`Unsupported video format: ${format}`);
  }
}

export class VideoFormat {
  private constructor(private readonly _value: SupportedVideoExtension) {}

  public static create(raw: string): VideoFormat {
    const normalized = raw.trim().toLowerCase().replace(/^\./, '');

    if (!SUPPORTED_VIDEO_EXTENSIONS.includes(normalized as SupportedVideoExtension)) {
      throw new UnsupportedVideoFormatError(raw);
    }

    return new VideoFormat(normalized as SupportedVideoExtension);
  }

  public get value(): SupportedVideoExtension {
    return this._value;
  }

  public get extension(): string {
    return `.${this._value}`;
  }

  public equals(other: VideoFormat): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
