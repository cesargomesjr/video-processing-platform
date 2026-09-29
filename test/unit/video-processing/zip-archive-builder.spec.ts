import { ZipArchiveBuilder } from '../../../src/contexts/video-processing/infrastructure/zip-archive-builder';

describe('ZipArchiveBuilder', () => {
  it('builds a zip with the expected signatures', async () => {
    const builder = new ZipArchiveBuilder();

    const buffer = await builder.build([
      { key: 'frame_000000.png', content: Buffer.from('first') },
      { key: 'frame_000001.png', content: Buffer.from('second') },
    ]);

    expect(buffer.readUInt32LE(0)).toBe(0x04034b50);
    expect(buffer.readUInt32LE(buffer.length - 22)).toBe(0x06054b50);
    expect(buffer.includes(Buffer.from('frame_000000.png'))).toBe(true);
    expect(buffer.includes(Buffer.from('frame_000001.png'))).toBe(true);
  });
});
