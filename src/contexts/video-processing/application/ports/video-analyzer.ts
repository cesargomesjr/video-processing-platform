export interface VideoAnalysis {
  durationMs: number;
  width: number;
  height: number;
  codec: string;
}

export interface VideoAnalyzer {
  analyze(storageKey: string): Promise<VideoAnalysis>;
}
