import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { VideoAnalysis, VideoAnalyzer } from '../application/ports/video-analyzer';

const execFileAsync = promisify(execFile);

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
}

interface FfprobeFormat {
  duration?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

export class FFprobeAnalyzer implements VideoAnalyzer {
  public constructor(private readonly binaryPath = 'ffprobe') {}

  public async analyze(storageKey: string): Promise<VideoAnalysis> {
    const { stdout } = await execFileAsync(this.binaryPath, [
      '-v',
      'error',
      '-show_streams',
      '-show_format',
      '-print_format',
      'json',
      storageKey,
    ]);

    const data = JSON.parse(stdout) as FfprobeOutput;
    const stream = data.streams?.find((item) => item.codec_type === 'video');

    if (stream === undefined) {
      throw new Error('No video stream found');
    }

    const durationSeconds = Number(data.format?.duration ?? stream.duration ?? 0);

    return {
      durationMs: Math.round(durationSeconds * 1_000),
      width: stream.width ?? 0,
      height: stream.height ?? 0,
      codec: stream.codec_name ?? 'unknown',
    };
  }
}
