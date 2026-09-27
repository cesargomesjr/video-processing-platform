import { ArchiveBuilder } from '../application/ports/archive-builder';

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIR_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIR = 0x06054b50;

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

export class ZipArchiveBuilder implements ArchiveBuilder {
  public build(files: ReadonlyArray<{ key: string; content: Buffer }>): Promise<Buffer> {
    const localChunks: Buffer[] = [];
    const centralChunks: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
      const name = Buffer.from(file.key, 'utf8');
      const crc = crc32(file.content);

      const local = Buffer.alloc(30);
      local.writeUInt32LE(LOCAL_FILE_HEADER, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0, 6);
      local.writeUInt16LE(0, 8);
      local.writeUInt16LE(0, 10);
      local.writeUInt16LE(0x21, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(file.content.length, 18);
      local.writeUInt32LE(file.content.length, 22);
      local.writeUInt16LE(name.length, 26);
      local.writeUInt16LE(0, 28);

      localChunks.push(local, name, file.content);
      offset += local.length + name.length + file.content.length;

      const central = Buffer.alloc(46);
      central.writeUInt32LE(CENTRAL_DIR_HEADER, 0);
      central.writeUInt16LE(20, 4);
      central.writeUInt16LE(20, 6);
      central.writeUInt16LE(0, 8);
      central.writeUInt16LE(0, 10);
      central.writeUInt16LE(0, 12);
      central.writeUInt16LE(0x21, 14);
      central.writeUInt32LE(crc, 16);
      central.writeUInt32LE(file.content.length, 20);
      central.writeUInt32LE(file.content.length, 24);
      central.writeUInt16LE(name.length, 28);
      central.writeUInt16LE(0, 30);
      central.writeUInt16LE(0, 32);
      central.writeUInt16LE(0, 34);
      central.writeUInt16LE(0, 36);
      central.writeUInt32LE(0, 38);
      central.writeUInt32LE(offset - local.length - name.length - file.content.length, 42);

      centralChunks.push(central, name);
    }

    const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(END_OF_CENTRAL_DIR, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(centralSize, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(0, 20);

    return Promise.resolve(Buffer.concat([...localChunks, ...centralChunks, eocd]));
  }
}
