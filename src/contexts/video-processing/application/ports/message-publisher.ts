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

export interface ChunkCompletedEvent {
  videoId: string;
  chunkIndex: number;
  frameCount: number;
}

export interface AllChunksCompletedEvent {
  videoId: string;
  totalChunks: number;
  totalFrames: number;
}

export interface VideoCompletedEvent {
  videoId: string;
  zipKey: string;
  frameCount: number;
}

export interface VideoProcessingFailedEvent {
  videoId: string;
  ownerId: string;
  reason: string;
  failedAt: Date;
}

export interface MessagePublisher {
  publishVideoAnalyzed(event: VideoAnalyzedEvent): Promise<void>;
  publishProcessVideoChunk(event: ProcessVideoChunkEvent): Promise<void>;
  publishChunkCompleted(event: ChunkCompletedEvent): Promise<void>;
  publishAllChunksCompleted(event: AllChunksCompletedEvent): Promise<void>;
  publishVideoCompleted(event: VideoCompletedEvent): Promise<void>;
  publishVideoProcessingFailed(event: VideoProcessingFailedEvent): Promise<void>;
}
