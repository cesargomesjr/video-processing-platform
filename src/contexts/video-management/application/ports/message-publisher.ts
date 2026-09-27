export interface VideoUploadedEvent {
  videoId: string;
  ownerId: string;
  storageKey: string;
  format: string;
  sizeBytes: number;
}

export interface MessagePublisher {
  publishVideoUploaded(event: VideoUploadedEvent): Promise<void>;
}
