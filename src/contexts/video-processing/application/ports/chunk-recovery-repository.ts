import { ProcessVideoChunkEvent } from './message-publisher';

export interface ChunkRecoveryRepository {
  reserveStale(before: Date, limit: number): Promise<ProcessVideoChunkEvent[]>;
}
