import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

import { FFmpegFrameExtractor } from '../../../src/contexts/video-processing/infrastructure/ffmpeg-frame-extractor';
import { ExtractFramesSpec } from '../../../src/contexts/video-processing/domain/extract-frames-spec';

const execFileAsync = promisify(execFile);

describe('FFmpegFrameExtractor', () => {
  let directory: string;
  let fixturePath: string;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'ffmpeg-'));
    fixturePath = join(directory, 'fixture.mp4');

    await execFileAsync(ffmpegInstaller.path, [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc=duration=3:size=320x240:rate=1',
      '-c:v',
      'mpeg4',
      '-q:v',
      '5',
      fixturePath,
    ]);
  }, 120_000);

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('extracts deterministic frame files from a chunk', async () => {
    const extractor = new FFmpegFrameExtractor(ffmpegInstaller.path);
    const outputDirectory = join(directory, 'frames');

    const frames = await extractor.extract({
      storageKey: fixturePath,
      spec: ExtractFramesSpec.create(0),
      outputDirectory,
      startSeconds: 0,
      durationSeconds: 2,
    });

    expect(frames.map((frame) => frame.key)).toEqual(['frame_000000.png', 'frame_000001.png']);
    expect(frames.every((frame) => frame.content.length > 0)).toBe(true);
  });
});
