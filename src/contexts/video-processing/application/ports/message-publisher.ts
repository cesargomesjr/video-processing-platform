export interface VideoAnalyzedEvent {
  videoId: string;
  durationMs: number;
  width: number;
  height: number;
  codec: string;
}

export interface MessagePublisher {
  publishVideoAnalyzed(event: VideoAnalyzedEvent): Promise<void>;
}
