import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { ExtractedFrame, FrameExtractor } from '../application/ports/frame-extractor';

const execFileAsync = promisify(execFile);

export class FFmpegFrameExtractor implements FrameExtractor {
  public constructor(private readonly binaryPath = 'ffmpeg') {}

  public async extract(input: Parameters<FrameExtractor['extract']>[0]): Promise<ExtractedFrame[]> {
    await mkdir(input.outputDirectory, { recursive: true });
    const outputPattern = join(input.outputDirectory, input.spec.outputPattern);

    await execFileAsync(this.binaryPath, [
      '-y',
      '-ss',
      String(input.startSeconds),
      '-i',
      input.storageKey,
      '-t',
      String(input.durationSeconds),
      '-vf',
      'fps=1',
      '-start_number',
      String(input.spec.startNumber),
      outputPattern,
    ]);

    const files = (await readdir(input.outputDirectory))
      .filter((file) => file.endsWith('.png'))
      .sort();

    return Promise.all(
      files.map(async (file) => ({
        key: file,
        content: await readFile(join(input.outputDirectory, file)),
      })),
    );
  }
}
