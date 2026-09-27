export interface ArchiveBuilder {
  build(files: ReadonlyArray<{ key: string; content: Buffer }>): Promise<Buffer>;
}
