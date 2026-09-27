import { ExtractFramesSpec } from '../../domain/extract-frames-spec';

export interface FrameExtractor {
  extract(input: {
    storageKey: string;
    spec: ExtractFramesSpec;
    outputDirectory: string;
  }): Promise<string[]>;
}
