export interface VideoAnalyzedEvent {
  videoId: string;
  durationMs: number;
  width: number;
  height: number;
  codec: string;
}

export interface ProcessVideoChunkEvent {
  videoId: string;
  chunkIndex: number;
  startSeconds: number;
  durationSeconds: number;
  storageKey: string;
}

export interface MessagePublisher {
  publishVideoAnalyzed(event: VideoAnalyzedEvent): Promise<void>;
  publishProcessVideoChunk(event: ProcessVideoChunkEvent): Promise<void>;
}
