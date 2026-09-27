import { ExtractFramesSpec } from '../../domain/extract-frames-spec';

export interface ExtractedFrame {
  key: string;
  content: Buffer;
}

export interface FrameExtractor {
  extract(input: {
    storageKey: string;
    spec: ExtractFramesSpec;
    outputDirectory: string;
  }): Promise<ExtractedFrame[]>;
}
