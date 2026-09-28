export const PROCESSING_VIDEO_STATUSES = [
  'PENDING',
  'ANALYZED',
  'PROCESSING',
  'AGGREGATING',
  'COMPLETED',
  'FAILED',
] as const;

export type ProcessingVideoStatus = (typeof PROCESSING_VIDEO_STATUSES)[number];

export interface ProcessingVideo {
  id: string;
  ownerId: string;
  storageKey: string;
  status: ProcessingVideoStatus;
  durationMs: number | null;
  zipKey: string | null;
}

export interface ProcessingVideoRepository {
  findById(id: string): Promise<ProcessingVideo | null>;
  markAnalyzed(id: string, durationMs: number): Promise<boolean>;
  markProcessing(id: string): Promise<boolean>;
  markAggregating(id: string): Promise<boolean>;
  markCompleted(id: string, zipKey: string): Promise<boolean>;
  markFailed(id: string, expectedStatus: ProcessingVideoStatus): Promise<boolean>;
  completePending(id: string, zipKey: string): Promise<boolean>;
}
