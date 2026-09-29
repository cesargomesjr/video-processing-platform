import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

import { FFprobeAnalyzer } from '../../../src/contexts/video-processing/infrastructure/ffprobe-analyzer';

const execFileAsync = promisify(execFile);

describe('FFprobeAnalyzer', () => {
  let directory: string;
  let fixturePath: string;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'ffprobe-'));
    fixturePath = join(directory, 'fixture.mp4');

    await execFileAsync(ffmpegInstaller.path, [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc=duration=2:size=320x240:rate=1',
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

  it('extracts duration, resolution and codec', async () => {
    const analyzer = new FFprobeAnalyzer(ffprobeInstaller.path);

    const analysis = await analyzer.analyze(fixturePath);

    expect(analysis.durationMs).toBeGreaterThan(1_800);
    expect(analysis.durationMs).toBeLessThanOrEqual(2_000);
    expect(analysis.width).toBe(320);
    expect(analysis.height).toBe(240);
    expect(analysis.codec).not.toBe('');
  });
});
